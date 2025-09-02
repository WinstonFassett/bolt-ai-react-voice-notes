Our audio recording/playback/storage/transcription is hacky at best.

Look at https://mediabunny.dev/guide/introduction#features
https://github.com/Vanilagy/mediabunny


Media Bunny Features
Here's a long list of stuff this library does:

Reading metadata from media files
Extracting media data from media files
Creating new media files
Converting media files
Hardware-accelerated decoding & encoding (via the WebCodecs API)
Support for multiple video, audio and subtitle tracks
Read & write support for many container formats (.mp4, .mov, .webm, .mkv, .mp3, .wav, .ogg, .aac), including variations such as MP4 with Fast Start, fragmented MP4, or streamable Matroska
Support for 25 different codecs
Lazy, optimized, on-demand file reading
Input and output streaming, arbitrary file size support
File location independence (memory, disk, network, ...)
Utilities for compression, resizing, rotation, resampling, trimming
Transmuxing and transcoding
Microsecond-accurate reading and writing precision
Efficient seeking through time
Pipelined design for efficient hardware usage and automatic backpressure
Custom encoder & decoder support for polyfilling
Low- & high-level abstractions for different use cases
Performant everything
Node.js support
...and there's probably more.


Quick start
Installation
Install it via npm:

npm install mediabunny
Alternatively, include it directly with a script tag using one of the builds. Doing so exposes a global Mediabunny object.

<script src="mediabunny.cjs"></script>
Requires any JavaScript environment that can run ECMAScript 2021 or later. Mediabunny is expected to be run in modern browsers. For types, TypeScript 5.7 or later is required.

Read file metadata
import { Input, ALL_FORMATS, BlobSource } from 'mediabunny';

const input = new Input({
    source: new BlobSource(file), // Reading from disk
    formats: ALL_FORMATS,
});

const duration = await input.computeDuration(); // in seconds
const videoTrack = await input.getPrimaryVideoTrack();
const audioTrack = await input.getPrimaryAudioTrack();
const { displayWidth, displayHeight, rotation } = videoTrack;
const { sampleRate, numberOfChannels } = audioTrack;
Create new media files
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } from 'mediabunny';

const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(), // Writing to memory
});

// Add a video track backed by a canvas element
const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_HIGH,
});
output.addVideoTrack(videoSource);

await output.start();
// Add frames...
await output.finalize();

const buffer = output.target.buffer; // Final MP4 file
Convert files
import { Input, Output, Conversion, ALL_FORMATS, BlobSource, WebMOutputFormat } from 'mediabunny';

const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
});

const output = new Output({
    format: new WebMOutputFormat(), // Convert to WebM
    target: new BufferTarget(),
});

const conversion = await Conversion.init({ input, output });
await conversion.execute();


There are examples of recording and creating downloadable tracks (with video - which we don't need).


https://mediabunny.dev/guide/packets-and-samples


https://mediabunny.dev/guide/supported-formats-and-codecs
Mediabunny supports many commonly used media container formats, all of which are supported bidirectionally (reading & writing):

ISOBMFF-based formats (.mp4, .m4v, .m4a, ...)
QuickTime File Format (.mov)
Matroska (.mkv)
WebM (.webm)
Ogg (.ogg)
MP3 (.mp3)
WAVE (.wav)
ADTS (.aac)


### Video codecs

* `'avc'` - Advanced Video Coding (AVC) / H.264
* `'hevc'` - High Efficiency Video Coding (HEVC) / H.265
* `'vp8'` - VP8
* `'vp9'` - VP9
* `'av1'` - AOMedia Video 1 (AV1)

### Audio codecs

* `'aac'` - Advanced Audio Coding (AAC)
* `'opus'` - Opus
* `'mp3'` - MP3
* `'vorbis'` - Vorbis
* `'flac'` - Free Lossless Audio Codec (FLAC)
* `'pcm-u8'` - 8-bit unsigned PCM
* `'pcm-s8'` - 8-bit signed PCM
* `'pcm-s16'` - 16-bit little-endian signed PCM
* `'pcm-s16be'` - 16-bit big-endian signed PCM
* `'pcm-s24'` - 24-bit little-endian signed PCM
* `'pcm-s24be'` - 24-bit big-endian signed PCM
* `'pcm-s32'` - 32-bit little-endian signed PCM
* `'pcm-s32be'` - 32-bit big-endian signed PCM
* `'pcm-f32'` - 32-bit little-endian float PCM
* `'pcm-f32be'` - 32-bit big-endian float PCM
* `'pcm-f64'` - 64-bit little-endian float PCM
* `'pcm-f64be'` - 64-bit big-endian float PCM
* `'ulaw'` - μ-law PCM
* `'alaw'` - A-law PCM

### Subtitle codecs

* `'webvtt'` - WebVTT

## Compatibility table

Not all codecs can be used with all containers. The following table specifies the supported codec-container combinations:

|                                                                                  | .mp4 | .mov | .mkv | .webm[\[1\]](https://mediabunny.dev/guide/supported-formats-and-codecs#fn1) | .ogg | .mp3 | .wav | .aac |
| :------------------------------------------------------------------------------: | :--: | :--: | :--: | :-------------------------------------------------------------------------: | :--: | :--: | :--: | :--: |
|                                      `'avc'`                                     |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                     `'hevc'`                                     |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                      `'vp8'`                                     |   ✓  |   ✓  |   ✓  |                                      ✓                                      |      |      |      |      |
|                                      `'vp9'`                                     |   ✓  |   ✓  |   ✓  |                                      ✓                                      |      |      |      |      |
|                                      `'av1'`                                     |   ✓  |   ✓  |   ✓  |                                      ✓                                      |      |      |      |      |
|                                      `'aac'`                                     |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |   ✓  |
|                                     `'opus'`                                     |   ✓  |   ✓  |   ✓  |                                      ✓                                      |   ✓  |      |      |      |
|                                      `'mp3'`                                     |   ✓  |   ✓  |   ✓  |                                                                             |      |   ✓  |      |      |
|                                    `'vorbis'`                                    |   ✓  |   ✓  |   ✓  |                                      ✓                                      |   ✓  |      |      |      |
|                                     `'flac'`                                     |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                    `'pcm-u8'`                                    |      |   ✓  |   ✓  |                                                                             |      |      |   ✓  |      |
|                                    `'pcm-s8'`                                    |      |   ✓  |      |                                                                             |      |      |      |      |
|                                    `'pcm-s16'`                                   |   ✓  |   ✓  |   ✓  |                                                                             |      |      |   ✓  |      |
|                                   `'pcm-s16be'`                                  |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                    `'pcm-s24'`                                   |   ✓  |   ✓  |   ✓  |                                                                             |      |      |   ✓  |      |
|                                   `'pcm-s24be'`                                  |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                    `'pcm-s32'`                                   |   ✓  |   ✓  |   ✓  |                                                                             |      |      |   ✓  |      |
|                                   `'pcm-s32be'`                                  |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                    `'pcm-f32'`                                   |   ✓  |   ✓  |   ✓  |                                                                             |      |      |   ✓  |      |
|                                   `'pcm-f32be'`                                  |   ✓  |   ✓  |      |                                                                             |      |      |      |      |
|                                    `'pcm-f64'`                                   |   ✓  |   ✓  |   ✓  |                                                                             |      |      |      |      |
|                                   `'pcm-f64be'`                                  |   ✓  |   ✓  |      |                                                                             |      |      |      |      |
|                                     `'ulaw'`                                     |      |   ✓  |      |                                                                             |      |      |   ✓  |      |
|                                     `'alaw'`                                     |      |   ✓  |      |                                                                             |      |      |   ✓  |      |
| `'webvtt'`[\[2\]](https://mediabunny.dev/guide/supported-formats-and-codecs#fn2) |  (✓) |      |  (✓) |                                     (✓)                                     |      |      |      |      |

## Querying codec encodability

Mediabunny provides utility functions that you can use to check if the browser can encode a given codec. Additionally, you can check if a codec is encodable with a specific *configuration*.

`canEncode` tests whether a codec can be encoded using typical settings:

```
import { canEncode } from 'mediabunny';

canEncode('avc'); // => Promise<boolean>
canEncode('opus'); // => Promise<boolean>
```

Video codecs are checked using 1280x720 @1Mbps, while audio codecs are checked using 2 channels, 48 kHz @128kbps.

You can also check encodability using specific configurations:

```
import { canEncodeVideo, canEncodeAudio } from 'mediabunny';

canEncodeVideo('hevc', {
	width: 1920, height: 1080, bitrate: 1e7
}); // => Promise<boolean>

canEncodeAudio('aac', {
	numberOfChannels: 1, sampleRate: 44100, bitrate: 192e3
}); // => Promise<boolean>
```

Additionally, most properties of [`VideoEncodingConfig`](https://mediabunny.dev/guide/media-sources#video-encoding-config) and [`AudioEncodingConfig`](https://mediabunny.dev/guide/media-sources#audio-encoding-config) can be used here as well.

***

In addition, you can use the following functions to check encodability for multiple codecs at once, getting back a list of supported codecs:

```
import {
	getEncodableCodecs,
	getEncodableVideoCodecs,
	getEncodableAudioCodecs,
	getEncodableSubtitleCodecs,
} from 'mediabunny';

getEncodableCodecs(); // => Promise<MediaCodec[]>
getEncodableVideoCodecs(); // => Promise<VideoCodec[]>
getEncodableAudioCodecs(); // => Promise<AudioCodec[]>
getEncodableSubtitleCodecs(); // => Promise<SubtitleCodec[]>

// These functions also accept optional configuration options.
// Here, we check which of AVC, HEVC and VP8 can be encoded at 1920x1080 @10Mbps:
getEncodableVideoCodecs(
	['avc', 'hevc', 'vp8'],
	{ width: 1920, height: 1080, bitrate: 1e7 },
); // => Promise<VideoCodec[]>
```

***

If you simply want to find the best codec that the browser can encode, you can use these functions, which return the first codec supported by the browser:

```
import {
	getFirstEncodableVideoCodec,
	getFirstEncodableAudioCodec,
	getFirstEncodableSubtitleCodec,
} from 'mediabunny';

getFirstEncodableVideoCodec(['avc', 'vp9', 'av1']); // => Promise<VideoCodec | null>
getFirstEncodableAudioCodec(['opus', 'aac']); // => Promise<AudioCodec | null>

getFirstEncodableVideoCodec(
	['avc', 'hevc', 'vp8'],
	{ width: 1920, height: 1080, bitrate: 1e7 },
); // => Promise<VideoCodec | null>
```

If none of the listed codecs is supported, `null` is returned.

These functions are especially useful in conjunction with an [output format](https://mediabunny.dev/guide/output-formats) to retrieve the best codec that is supported both by the encoder as well as the container format:

```
import {
	Mp4OutputFormat,
	getFirstEncodableVideoCodec,
} from 'mediabunny';

const outputFormat = new Mp4OutputFormat();
const containableVideoCodecs = outputFormat.getSupportedVideoCodecs();
const bestVideoCodec = await getFirstEncodableVideoCodec(containableVideoCodecs);
```

INFO

Codec encodability checks take [custom encoders](https://mediabunny.dev/guide/supported-formats-and-codecs#custom-encoders) into account.

## Querying codec decodability

Whether a codec can be decoded depends on the specific codec configuration of an `InputTrack`; you can use its [`canDecode`](https://mediabunny.dev/guide/reading-media-files#codec-information) method to check.

## Custom coders

Mediabunny allows you to register your own custom encoders and decoders - useful if you want to polyfill a codec that's not supported in all browsers, or want to use Mediabunny outside of an environment with WebCodecs (such as Node.js).

Encoders and decoders can be registered for [all video and audio codecs](https://mediabunny.dev/guide/supported-formats-and-codecs#codecs) supported by the library. It is not possible to add new codecs.

WARNING

Mediabunny requires customs encoders and decoders to follow very specific implementation rules. Pay special attention to the parts labeled with "**must**" to ensure compatibility.

### Custom encoders

To create a custom video or audio encoder, you'll need to create a class which extends `CustomVideoEncoder` or `CustomAudioEncoder`. Then, you **must** register this class using `registerEncoder`:

```
import { CustomAudioEncoder, registerEncoder } from 'mediabunny';

class MyAwesomeMp3Encoder extends CustomAudioEncoder {
	// ...
}
registerEncoder(MyAwesomeMp3Encoder);
```

The following properties are available on each encoder instance and are set by the library:

```
class {
	// For video encoders:
	codec: VideoCodec;
	config: VideoEncoderConfig;
	onPacket: (packet: EncodedPacket, meta?: EncodedVideoChunkMetadata) => unknown;

	// For audio encoders:
	codec: AudioCodec;
	config: AudioEncoderConfig;
	onPacket: (packet: EncodedPacket, meta?: EncodedAudioChunkMetadata) => unknown;
}
```

`codec` and `config` specify the concrete codec configuration to use, and `onPacket` is a method that your code **must** call for each encoded packet it creates.

You **must** implement the following methods in your custom encoder class:

```
class {
	// For video encoders:
	static supports(codec: VideoCodec, config: VideoEncoderConfig): boolean;
	// For audio encoders:
	static supports(codec: AudioCodec, config: AudioEncoderConfig): boolean;

	init(): Promise<void> | void;
	encode(sample: VideoSample, options: VideoEncoderEncodeOptions): Promise<void> | void; // For video
	encode(sample: AudioSample): Promise<void> | void; // For audio
	flush(): Promise<void> | void;
	close(): Promise<void> | void;
}
```

* `supports`\
  This is a *static* method that **must** return `true` if the encoder is able to encode the specified codec, and `false` if not. If it returns `true`, a new instance of your encoder class will be created by the library and will be used for encoding, taking precedence over the default encoders.
* `init`\
  Called by the library after your class is instantiated. Place any initialization logic here.
* `encode`\
  Called for each sample that is to be encoded. The resulting encoded packet **must** then be passed to the `onPacket` method.
* `flush`\
  Called when the encoder is expected to finish the encoding process for all remaining samples that haven't finished encoding yet. This method **must** return/resolve only once all samples passed to `encode` have been fully encoded. It **must** then reset its own internal state to be ready for the next encoding batch.
* `close`\
  Called when the encoder is no longer needed and can release its internal resources.

INFO

All instance methods of the class can return promises. In this case, the library will make sure to *serialize* all method calls such that no two methods ever run concurrently.

WARNING

The packets passed to `onPacket` **must** be in [decode order](https://mediabunny.dev/guide/media-sinks#decode-vs-presentation-order).

### Custom decoders

To create a custom video or audio decoder, you'll need to create a class which extends `CustomVideoDecoder` or `CustomAudioDecoder`. Then, you **must** register this class using `registerDecoder`:

```
import { CustomAudioDecoder, registerDecoder } from 'mediabunny';

class MyAwesomeMp3Decoder extends CustomAudioDecoder {
	// ...
}
registerDecoder(MyAwesomeMp3Decoder);
```

The following properties are available on each decoder instance and are set by the library:

```
class {
	// For video decoders:
	codec: VideoCodec;
	config: VideoDecoderConfig;
	onSample: (sample: VideoSample) => unknown;

	// For audio decoders:
	codec: AudioCodec;
	config: AudioDecoderConfig;
	onSample: (sample: AudioSample) => unknown;
}
```

`codec` and `config` specify the concrete codec configuration to use, and `onSample` is a method that your code **must** call for each video/audio sample it creates.

You **must** implement the following methods in your custom decoder class:

```
class {
	// For video decoders:
	static supports(codec: VideoCodec, config: VideoDecoderConfig): boolean;
	// For audio decoders:
	static supports(codec: AudioCodec, config: AudioDecoderConfig): boolean;

	init(): Promise<void> | void;
	decode(packet: EncodedPacket): Promise<void> | void;
	flush(): Promise<void> | void;
	close(): Promise<void> | void;
}
```

* `supports`\
  This is a *static* method that **must** return `true` if the decoder is able to decode the specified codec, and `false` if not. If it returns `true`, a new instance of your decoder class will be created by the library and will be used for decoding, taking precedence over the default decoders.
* `init`\
  Called by the library after your class is instantiated. Place any initialization logic here.
* `decode`\
  Called for each `EncodedPacket` that is to be decoded. The resulting video or audio sample **must** then be passed to the `onSample` method.
* `flush`\
  Called when the decoder is expected to finish the decoding process for all remaining packets that haven't finished decoding yet. This method **must** return/resolve only once all packets passed to `decode` have been fully decoded. It **must** then reset its own internal state to be ready for the next decoding batch.
* `close`\
  Called when the decoder is no longer needed and can release its internal resources.

INFO

All instance methods of the class can return promises. In this case, the library will make sure to *serialize* all method calls such that no two methods ever run concurrently.

WARNING

The samples passed to `onSample` **must** be sorted by increasing timestamp. This especially means if the decoder is decoding a video stream that makes use of [B-frames](https://mediabunny.dev/guide/media-sources#b-frames), the decoder **must** internally hold on to these frames so it can emit them sorted by presentation timestamp. This strict sorting requirement is reset each time `flush` is called.

***

1. WebM only supports a small subset of the codecs supported by Matroska. However, this library can technically read all codecs from a WebM that are supported by Matroska. [↩︎](https://mediabunny.dev/guide/supported-formats-and-codecs#fnref1)
2. WebVTT can only be written, not read. [↩︎](https://mediabunny.dev/guide/supported-formats-and-codecs#fnref2)

