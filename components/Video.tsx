"use client";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

import { useSearchParams } from "next/navigation";

import React,{ useEffect, useMemo } from "react";

import { meeting } from "@/lib/actions/appointment.actions";

const generateRandomID = (length: number): string => {
  const chars =
    "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const Video: React.FC = () => {
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId");
  const appointmentId = searchParams.get("appointmentId");
  const roomID = useMemo(
    () => searchParams.get("roomID") || generateRandomID(5),
    [searchParams]
  );

  useEffect(() => {
    const initMeeting = async () => {
      if (!userId || !appointmentId) {
        console.error("Missing userId or appointmentId");
        return;
      }

      const element = document.querySelector(".myCallContainer") as HTMLElement;
      if (!element) return;

      const appID = 1599881424;
      const serverSecret = process.env.NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET!;

      if (!serverSecret) {
        console.error(
          "Missing ZegoCloud server secret in environment variables"
        );
        return;
      }

      const meetingLink = `${window.location.origin}/video?appointmentId=${appointmentId}&userId=${userId}&roomID=${roomID}`;

      try {
        await meeting(appointmentId, meetingLink);
      } catch (error) {
        console.error("Failed to update meeting link:", error);
      }

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomID,
        generateRandomID(5),
        generateRandomID(5)
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zp.joinRoom({
        container: element,
        sharedLinks: [{ name: "Appointment Link", url: meetingLink }],
        scenario: {
          mode: ZegoUIKitPrebuilt.GroupCall,
        },
      });
    };

    initMeeting();
  }, [userId, appointmentId, roomID]);

  return (
    <div
      className="myCallContainer"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
};

export default Video;
