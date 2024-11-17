const details = () => ({
  id: "Tdarr_Plugin_CleanTitle",
  Stage: "Pre-processing",
  Name: "Clean title metadata",
  Type: "Video",
  Operation: "Transcode",
  Description: "This plugin removes title metadata from video/audio/subtitles",
  Version: "1.9",
  Tags: "pre-processing,ffmpeg,configurable",
  Inputs: [
    {
      name: "custom_title_matching",
      type: "string",
      defaultValue: "",
      inputUI: {
        type: "text",
      },
      tooltip: `Remove unwanted audio stream based on the stream title. Example: sdh,full`,
    },
    {
      name: "custom_title_matching_subtitles",
      type: "string",
      defaultValue: "",
      inputUI: {
        type: "text",
      },
      tooltip: `Remove unwanted subtitles stream based on the stream title. Example: vfq,original`,
    },
  ],
});

const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require("../methods/lib")();

  inputs = lib.loadDefaultValues(inputs, details);
  const response = {
    processFile: false,
    preset: "",
    container: `.${file.container}`,
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: "",
  };

  // Set up required variables.

  let ffmpegCommandInsert = "";
  let subtitleMapping = "";
  let audioMapping = "";
  let forcedsubtitles = "";
  let videoIdx = 0;
  let audioIdx = 0;
  let subtitleIdx = 0;
  let convert = false;

  const forcedKeywords = ["forced", "forces"];
  const sdhKeywords = ["sdh", "commentaires", "commentary"];

  const formatCustomTitles = (titles) =>
    titles ? titles.toLowerCase().split(",") : "";

  const checkNotEmptyTitle = (title) => {
    return !(title === undefined || title === '""' || title === "");
  };

  const custom_title_matching_audio = formatCustomTitles(
    inputs.custom_title_matching,
  );
  const custom_title_matching_subtitles = formatCustomTitles(
    inputs.custom_title_matching_subtitles,
  );

  response.infoLog += `All audio custom titles unwanted: ${custom_title_matching_audio}\n`;
  response.infoLog += `All subtitles custom titles unwanted: ${custom_title_matching_subtitles}\n`;

  // Check if inputs.custom_title_matching has been configured. If it has then set variable

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== "video") {
    response.infoLog += "☒File is not video \n";
    response.processFile = false;
    return response;
  }

  // Check if overall file metadata title is not empty, if it's not empty set to "".
  if (checkNotEmptyTitle(file.meta.Title)) {
    ffmpegCommandInsert += " -metadata title= ";
    convert = true;
  }

  for (let i = 0; i < file.ffProbeData.streams.length; i += 1) {
    const codecType = file.ffProbeData.streams[i].codec_type.toLowerCase();
    const streamTitle = file.ffProbeData.streams[i].tags?.title
      ? file.ffProbeData.streams[i].tags.title.toLowerCase()
      : undefined;
    if (codecType === "video") {
      if (checkNotEmptyTitle(streamTitle)) {
        response.infoLog += `Video stream title is not empty. Removing title from stream ${i} \n`;
        ffmpegCommandInsert += ` -metadata:s:v:${videoIdx} title= `;
        convert = true;
      }
      videoIdx += 1;
    }

    if (codecType === "audio") {
      response.infoLog += `Audio stream ${audioIdx}\n`;
      if (checkNotEmptyTitle(streamTitle)) {
        if (
          custom_title_matching_audio.some((title) =>
            title.includes(streamTitle),
          )
        ) {
          audioMapping = `${audioMapping} -map -0:a:${audioIdx}`;
          response.infoLog += `Audio stream ${audioIdx} has unwanted audio \n`;
        } else {
          response.infoLog += `Audio stream title is not empty. Removing title from stream ${i} \n`;
          ffmpegCommandInsert += ` -metadata:s:a:${audioIdx} title= `;
        }

        convert = true;
      }

      audioIdx += 1;
    }
    if (codecType === "subtitle") {
      response.infoLog += `Subtitle stream ${subtitleIdx}\n`;

      if (checkNotEmptyTitle(streamTitle)) {
        if (
          custom_title_matching_subtitles.some((title) =>
            title.includes(streamTitle),
          )
        ) {
          response.infoLog += `This stream has unwanted subtitles :  ${streamTitle}\n`;
          subtitleMapping = `${subtitleMapping} -map -0:s:${subtitleIdx}`;
        } else {
          response.infoLog += `Subtitle stream ${subtitleIdx}  has no unwanted subtitles \n`;
          if (forcedKeywords.some((keyword) => streamTitle.includes(keyword))) {
            if (file.ffProbeData.streams[i].disposition.forced === 1) {
              response.infoLog += `Subtitle stream ${subtitleIdx} has already forced flag : ${streamTitle}\n`;
            } else {
              forcedsubtitles += ` -disposition:s:${subtitleIdx} forced`;
              response.infoLog += `Subtitle stream ${subtitleIdx} forced subtitles and has no forced flag : ${streamTitle}\n`;
            }
          } else {
            response.infoLog += `Subtitle stream ${subtitleIdx} has no forced subtitles \n`;
          }

          if (sdhKeywords.some((keyword) => streamTitle.includes(keyword))) {
            if (
              file.ffProbeData.streams[i].disposition.hearing_impaired === 1
            ) {
              response.infoLog += `Subtitle stream ${subtitleIdx} has already hearing_impaired flag : ${streamTitle}\n`;
            } else {
              forcedsubtitles += ` -disposition:s:${subtitleIdx} hearing_impaired`;
              response.infoLog += `Subtitle stream ${subtitleIdx} hearing_impaired subtitles and has no hearing_impaired flag : ${streamTitle}\n`;
            }
          } else {
            response.infoLog += `Subtitle stream ${subtitleIdx} has no hearing_impaired subtitles \n`;
          }

          response.infoLog += `Subtitle stream title is not empty. Removing title from stream ${i}\n`;
          ffmpegCommandInsert += ` -metadata:s:s:${subtitleIdx} title= `;
        }

        convert = true;
      }

      subtitleIdx += 1;
    }
  }

  if (convert) {
    response.preset = `,${ffmpegCommandInsert} ${forcedsubtitles} -c copy -map 0 ${subtitleMapping} ${audioMapping} -max_muxing_queue_size 9999 -fflags +bitexact`;
    response.reQueueAfter = true;
    response.processFile = true;
  } else {
    response.infoLog += "Skipping, file has no title metadata \n";
  }
  return response;
};
module.exports.details = details;
module.exports.plugin = plugin;
