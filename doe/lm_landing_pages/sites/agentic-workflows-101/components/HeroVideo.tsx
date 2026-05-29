type Props = {
  src: string;
};

export default function HeroVideo({ src }: Props) {
  return (
    <>
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
    </>
  );
}
