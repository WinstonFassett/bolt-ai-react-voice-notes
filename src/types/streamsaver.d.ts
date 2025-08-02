declare module 'streamsaver' {
  export interface StreamSaverOptions {
    size?: number;
    writableStrategy?: QueuingStrategy<Uint8Array>;
    readableStrategy?: QueuingStrategy<Uint8Array>;
  }

  export interface StreamSaver {
    createWriteStream(
      filename: string,
      options?: StreamSaverOptions
    ): WritableStream<Uint8Array>;
    mitm: string;
    supported: boolean;
    version: {
      full: string;
      major: number;
      minor: number;
      dot: number;
    };
  }

  const streamSaver: StreamSaver;
  export default streamSaver;
}
