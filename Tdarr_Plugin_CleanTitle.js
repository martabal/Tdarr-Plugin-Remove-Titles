const details = () => ({
  id: 'Tdarr_Plugin_CleanTitle',
  Stage: 'Pre-processing',
  Name: 'Clean title metadata',
  Type: 'Video',
  Operation: 'Transcode',
  Description: 'This plugin removes title metadata from video/audio/subtitles.\n\n',
  Version: '1.9',
  Tags: 'pre-processing,ffmpeg,configurable',
  Inputs: [],
});

// eslint-disable-next-line no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  const response = {
    processFile: false,
    preset: '',
    container: `.${file.container}`,
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: '',
  };

  // Set up required variables.

  let ffmpegCommandInsert = '';
  let videoIdx = 0;
  let audioIdx = 0;
  let subtitleIdx = 0;
  let convert = false;
  let custom_title_matching = '';

  // Check if inputs.custom_title_matching has been configured. If it has then set variable


  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== 'video') {
    // eslint-disable-next-line no-console
    console.log('File is not video');
    response.infoLog += '☒File is not video \n';
    response.processFile = false;
    return response;
  }

  // Check if overall file metadata title is not empty, if it's not empty set to "".
  if (
    !(
      typeof file.meta.Title === 'undefined'
        || file.meta.Title === '""'
        || file.meta.Title === ''
    )
  ) {
    try {
      ffmpegCommandInsert += ' -metadata title= ';
      convert = true;
    } catch (err) {
      // Error
    }
  }

  // Go through each stream in the file.
  for (let i = 0; i < file.ffProbeData.streams.length; i += 1) {
    // Check if stream is a video.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === 'video') {
      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === 'undefined'
            || file.ffProbeData.streams[i].tags.title === '""'
            || file.ffProbeData.streams[i].tags.title === ''
          )
        ) {
          response.infoLog += `☒Video stream title is not empty. Removing title from stream ${i} \n`;
          ffmpegCommandInsert += ` -metadata:s:v:${videoIdx} title= `;
          convert = true;
        }
        // Increment videoIdx.
        videoIdx += 1;
      } catch (err) {
        // Error
      }
    }
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === 'audio') {
      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === 'undefined'
            || file.ffProbeData.streams[i].tags.title === '""'
            || file.ffProbeData.streams[i].tags.title === ''
          )
        ) {
          response.infoLog += `☒Audio stream title is not empty. Removing title from stream ${i} \n`;
          ffmpegCommandInsert += ` -metadata:s:a:${audioIdx} title= `;
          convert = true;
        }
        // Increment videoIdx.
        audioIdx += 1;
      } catch (err) {
        // Error
      }
    }
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === 'subtitle') {
      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === 'undefined'
            || file.ffProbeData.streams[i].tags.title === '""'
            || file.ffProbeData.streams[i].tags.title === ''
          )
        ) {
          response.infoLog += `☒Subtitle stream title is not empty. Removing title from stream ${i} \n`;
          ffmpegCommandInsert += ` -metadata:s:s:${subtitleIdx} title= `;
          convert = true;
        }
        // Increment videoIdx.
        subtitleIdx += 1;
      } catch (err) {
        // Error
      }
    }


    // Check if title metadata of subtitle stream has more then 3 full stops.
    // If so then it's likely to be junk metadata so remove.
    // Then check if any streams match with user input custom_title_matching variable, if so then remove.

  }

  // Convert file if convert variable is set to true.
  if (convert === true) {
    response.infoLog += '☒File has title metadata. Removing \n';
    response.preset = `,${ffmpegCommandInsert} -c copy -map 0 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact -max_muxing_queue_size 9999`;
    response.reQueueAfter = true;
    response.processFile = true;
  } else {
    response.infoLog += '☑File has no title metadata \n';
  }
  return response;
};
module.exports.details = details;
module.exports.plugin = plugin;
