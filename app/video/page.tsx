import dynamic from "next/dynamic";

const Video = dynamic(() => import("@/components/Video"), { ssr: false });

export default function VideoPage() {
  return (
    <div>
      <Video />
    </div>
  );
}
