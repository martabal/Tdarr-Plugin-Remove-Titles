const details = () => ({
  id: "Tdarr_Plugin_CleanTitle",
  Stage: "Pre-processing",
  Name: "Clean title metadata",
  Type: "Video",
  Operation: "Transcode",
  Description:
    "This plugin removes title metadata from video/audio/subtitles.\n\n",
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
      tooltip: `Here you can specify your own text for it to also search for to match and remove the subtitle track.
            \\nThis is one way to identify junk metadata without removing real metadata that you might want.    
               
               \\nExample:\\n
               sdh,full`,
    },
    {
      name: "custom_forced_subtitles_matching",
      type: "string",
      defaultValue: "",
      inputUI: {
        type: "text",
      },
      tooltip: `Here you can specify your own text for it to also search for to match and set the subtitle track to forced. 
               
               \\nExample:\\n
               forced,forced`,
    },
  ],
});

// eslint-disable-next-line no-unused-vars
const plugin = (file, _, inputs, _) => {
  const lib = require("../methods/lib")();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
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
  let subtitlesdh = "";
  let audiosdh = "";
  let forcedsubtitles = "";
  let videoIdx = 0;
  let audioIdx = 0;
  let subtitleIdx = 0;
  let convert = false;
  let custom_title_matching = [];
  let custom_forced_subtitles_matching = [];
  let forced_unwanted = false;
  let unwanted = false;
  let unwantedstring = "";

  if (inputs.custom_forced_subtitles_matching !== "") {
    custom_forced_subtitles_matching = inputs.custom_forced_subtitles_matching
      .toLowerCase()
      .split(",");
  }

  if (inputs.custom_title_matching !== "") {
    custom_title_matching = inputs.custom_title_matching
      .toLowerCase()
      .split(",");
  }

  response.infoLog += "All custom titles unwanted : \n";
  for (const customTitle of custom_title_matching) {
    response.infoLog += customTitle.toLowerCase() + "\n";
  }
  for (const customForcedSubtitle of custom_forced_subtitles_matching) {
    response.infoLog += customForcedSubtitle.toLowerCase() + "\n";
  }
  response.infoLog += "=======================\n";
  response.infoLog += "\n";

  // Check if inputs.custom_title_matching has been configured. If it has then set variable

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== "video") {
    // eslint-disable-next-line no-console
    console.log("File is not video");
    response.infoLog += "☒File is not video \n";
    response.processFile = false;
    return response;
  }

  // Check if overall file metadata title is not empty, if it's not empty set to "".
  if (
    !(
      typeof file.meta.Title === "undefined" ||
      file.meta.Title === '""' ||
      file.meta.Title === ""
    )
  ) {
    try {
      ffmpegCommandInsert += " -metadata title= ";
      convert = true;
    } catch (err) {
      // Error
    }
  }

  // Go through each stream in the file.
  for (let i = 0; i < file.ffProbeData.streams.length; i += 1) {
    // Check if stream is a video.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === "video") {
      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === "undefined" ||
            file.ffProbeData.streams[i].tags.title === '""' ||
            file.ffProbeData.streams[i].tags.title === ""
          )
        ) {
          response.infoLog += `Video stream title is not empty. Removing title from stream ${i} \n`;
          ffmpegCommandInsert += ` -metadata:s:v:${videoIdx} title= `;
          convert = true;
        }
        // Increment videoIdx.
        videoIdx += 1;
      } catch (err) {
        // Error
      }
    }
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === "audio") {
      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === "undefined" ||
            file.ffProbeData.streams[i].tags.title === '""' ||
            file.ffProbeData.streams[i].tags.title === ""
          )
        ) {
          if (
            file.ffProbeData.streams[i].tags.title
              .toLowerCase()
              .includes("vfq") === true &&
            audiosdh.includes("s:" + audioIdx) === false
          ) {
            audiosdh = audiosdh + " -map -0:a:" + audioIdx;
            response.infoLog +=
              "Audio stream " + audioIdx + " has unwanted audio \n";
            unwanted = true;
          }
          if (unwanted === false) {
            response.infoLog += `Audio stream title is not empty. Removing title from stream ${i} \n`;
            ffmpegCommandInsert += ` -metadata:s:a:${audioIdx} title= `;
          }

          convert = true;
          unwanted = false;
        }
        // Increment videoIdx.
        audioIdx += 1;
      } catch (err) {
        // Error
      }
    }
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === "subtitle") {
      response.infoLog += "Subtitle stream " + subtitleIdx + "\n";
      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === "undefined" ||
            file.ffProbeData.streams[i].tags.title === '""' ||
            file.ffProbeData.streams[i].tags.title === ""
          )
        ) {
          for (let j = 0; j < custom_title_matching.length; j += 1) {
            if (
              file.ffProbeData.streams[i].tags.title
                .toLowerCase()
                .includes(custom_title_matching[j].toLowerCase()) === true &&
              subtitlesdh.includes("s:" + subtitleIdx) === false &&
              unwanted === false
            ) {
              forced_unwanted = true;
              unwanted = true;
              unwantedstring = custom_title_matching[j].toLowerCase();
            }
          }
          if (unwanted === true) {
            response.infoLog +=
              "This stream has unwanted subtitles : " + unwantedstring + "\n";
            subtitlesdh = subtitlesdh + " -map -0:s:" + subtitleIdx;
          }
          if (unwanted === false) {
            response.infoLog +=
              "Subtitle stream " +
              subtitleIdx +
              " has no unwanted subtitles \n";
          }

          if (
            custom_forced_subtitles_matching.includes(
              file.ffProbeData.streams[i].tags.title,
            ) &&
            forced_unwanted
          ) {
            response.infoLog +=
              "Subtitle stream " +
              subtitleIdx +
              " has forced subtitles : " +
              file.ffProbeData.streams[i].tags.title +
              "\n";
            if (file.ffProbeData.streams[i].disposition.forced == 1) {
              response.infoLog +=
                "Subtitle stream " +
                subtitleIdx +
                " has already forced flag : " +
                file.ffProbeData.streams[i].tags.title +
                "\n";
            } else {
              forcedsubtitles =
                forcedsubtitles + " -disposition:s:" + subtitleIdx + " forced";
              response.infoLog +=
                "Subtitle stream " +
                subtitleIdx +
                " forced subtitles and has no forced flags : " +
                file.ffProbeData.streams[i].tags.title +
                "\n";
            }
          } else {
            if (forced_unwanted === false) {
              response.infoLog +=
                "Subtitle stream " +
                subtitleIdx +
                " has no forced subtitles \n";
            }
          }
          if (forced_unwanted === false) {
            response.infoLog += `Subtitle stream title is not empty. Removing title from stream ${i} \n`;
            ffmpegCommandInsert += ` -metadata:s:s:${subtitleIdx} title= `;
          }

          convert = true;
          unwanted = false;
          unwantedstring = "";
        }
        // Increment videoIdx.
        subtitleIdx += 1;
      } catch (err) {
        response.infoLog += `Error :` + err + ` \n`;
      }
    }

    // Check if title metadata of subtitle stream has more then 3 full stops.
    // If so then it's likely to be junk metadata so remove.
    // Then check if any streams match with user input custom_title_matching variable, if so then remove.
    forced_unwanted = false;
  }

  // Convert file if convert variable is set to true.
  if (convert === true) {
    response.infoLog += "☒File has title metadata. Removing \n";
    response.preset = `,${ffmpegCommandInsert} -fflags +bitexact -flags:v +bitexact -flags:s +bitexact -flags:a +bitexact ${forcedsubtitles} -c copy  -map 0 ${subtitlesdh} ${audiosdh} -max_muxing_queue_size 9999`;
    response.reQueueAfter = true;
    response.processFile = true;
  } else {
    response.infoLog += "Skipping, File has no title metadata \n";
  }
  return response;
};
module.exports.details = details;
module.exports.plugin = plugin;
