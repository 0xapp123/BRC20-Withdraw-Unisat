// In custom.d.ts
declare module '*.png' {
    const value: any;
    export = value;
  }
  
  declare module '*.webp' {
    const content: any;
    export default content;
  }
  