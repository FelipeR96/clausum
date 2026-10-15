declare module 'pdf-img-convert' {
  interface ConvertOptions {
    scale?: number;
    page_numbers?: number[];
    width?: number;
    height?: number;
  }

  export function convert(
    pdf: Buffer | Uint8Array,
    options?: ConvertOptions
  ): Promise<Uint8Array[]>;

  const pdfImgConvert: {
    convert: typeof convert;
  };

  export default pdfImgConvert;
}
