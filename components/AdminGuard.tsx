"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasskeyModal } from "@/components/PasskeyModal";
import { decryptKey } from "@/lib/utils";

interface AdminGuardProps {
    children: React.ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAccess = () => {
            const encryptedKey = window.localStorage.getItem("accessKey");
            const accessKey = encryptedKey && decryptKey(encryptedKey);

            if (accessKey === process.env.NEXT_PUBLIC_ADMIN_PASSKEY) {
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
            }
            setIsChecking(false);
        };

        checkAccess();

        // Listen for storage changes (when passkey is entered)
        const handleStorageChange = () => {
            checkAccess();
        };

        window.addEventListener("storage", handleStorageChange);

        // Also check periodically in case storage event doesn't fire
        const interval = setInterval(checkAccess, 500);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(interval);
        };
    }, [router]);

    if (isChecking) {
        return (
            <div className="min-h-screen w-full bg-dark-300 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-dark-700">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {!isAuthorized && <PasskeyModal />}
            {isAuthorized && children}
        </>
    );
};
