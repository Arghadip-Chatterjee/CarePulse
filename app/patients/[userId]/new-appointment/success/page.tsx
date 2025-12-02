import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
// import { Doctors } from "@/constants";
import { getAppointment } from "@/lib/actions/appointment.actions";
import { formatDateTime } from "@/lib/utils";

const RequestSuccess = async ({
  searchParams,
  params: { userId },
}: SearchParamProps) => {
  const appointmentId = (searchParams?.appointmentId as string) || "";
  const isWaitingList = searchParams?.waitingList === "true";
  const appointment = await getAppointment(appointmentId);

  if (!appointment) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">
            Unauthorized Access
          </h1>
          <p className="text-lg mb-6">
            The Patient ID is invalid or not found in our database.
          </p>
        </div>
      </div>
    );
  }

  // Check if appointment is in waiting list (from status or query param)
  const isInWaitingList = isWaitingList || appointment.status === "waitingList";

  return (
    <div className=" flex h-screen max-h-screen px-[5%]">
      <div className="success-img">
        <Link href="/">
          <Image
            src="/assets/icons/logo-full.svg"
            height={1000}
            width={1000}
            alt="logo"
            className="h-10 w-fit"
          />
        </Link>

        <section className="flex flex-col items-center">
          <Image
            src="/assets/gifs/success.gif"
            height={300}
            width={280}
            alt="success"
          />
          {isInWaitingList ? (
            <>
              <h2 className="header mb-6 max-w-[600px] text-center">
                You have been added to the <span className="text-yellow-500">waiting list</span>!
              </h2>
              <p className="text-center mb-4">
                You will be notified when a slot becomes available for your selected time.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 max-w-[600px]">
                <p className="text-yellow-400 text-sm">
                  <strong>Note:</strong> You are on the waiting list. When an appointment is cancelled, 
                  you will be automatically assigned to that slot and notified.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="header mb-6 max-w-[600px] text-center">
                Your <span className="text-green-500">appointment request</span> has
                been successfully submitted!
              </h2>
              <p>We&apos;ll be in touch shortly to confirm.</p>
            </>
          )}
        </section>

        <section className="request-details">
          <p>Requested appointment details: </p>
          <div className="flex gap-2">
            <Image
              src="/assets/icons/calendar.svg"
              height={24}
              width={24}
              alt="calendar"
            />
            <p> {formatDateTime(appointment.schedule).dateTime}</p>
          </div>
        </section>

        <Button variant="outline" className="shad-primary-btn" asChild>
          <Link href={`/patients/${userId}/new-appointment`}>
            New Appointment
          </Link>
        </Button>

        <p className="copyright">© 2024 CarePluse</p>
      </div>
    </div>
  );
};

export default RequestSuccess;
