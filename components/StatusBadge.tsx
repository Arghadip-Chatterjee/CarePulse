import clsx from "clsx";
import Image from "next/image";

import { StatusIcon } from "@/constants";

export const StatusBadge = ({ status }: { status: Status }) => {
  return (
    <div
      className={clsx("status-badge", {
        "bg-green-600": status === "scheduled",
        "bg-blue-600": status === "pending",
        "bg-red-600": status === "cancelled",
        "bg-green-500": status === "verified",
        "bg-red-800": status === "unverified",
        "bg-yellow-600": status === "waitingList",
        "bg-emerald-600": status === "visited",
        "bg-orange-600": status === "notVisited",
      })}
    >
      <Image
        src={StatusIcon[status]}
        alt="doctor"
        width={24}
        height={24}
        className="h-fit w-3"
      />
      <p
        className={clsx("text-12-semibold capitalize", {
          "text-green-500": status === "scheduled",
          "text-blue-500": status === "pending",
          "text-red-500": status === "cancelled",
          "text-yellow-500": status === "waitingList",
          "text-emerald-500": status === "visited",
          "text-orange-500": status === "notVisited",
        })}
      >
        {status === "notVisited" ? "Not Visited" : status}
      </p>
    </div>
  );
};
