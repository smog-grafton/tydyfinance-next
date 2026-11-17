/**
 * Keep `tsc --noEmit` usable in a clean checkout before Next.js has generated
 * its ignored `next-env.d.ts` file. Next's generated declarations remain the
 * runtime authority; these cover the static assets imported by this project.
 */
declare module '*.png' {
  const image: import('next/image').StaticImageData
  export default image
}

declare module '*.jpg' {
  const image: import('next/image').StaticImageData
  export default image
}

declare module '*.svg' {
  const image: import('next/image').StaticImageData
  export default image
}
