import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/user.service";
import Loader from "./utils/Loader";

export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  const { isAuthenticated, setUser, clearUser } = useUserStore();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };



  if (!isOnline) {
    return (
      <div className="fixed inset-0 bg-red-600 flex flex-col items-center justify-center text-white z-50 p-6">
      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-20 w-20 mb-6 animate-bounce"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2v6m-2 4h4m-2-4V4"
        />
      </svg>

      {/* Message */}
      <h1 className="text-3xl font-bold mb-2">No Network Connection</h1>
      <p className="text-lg mb-6 text-center">
        Please check your internet connection and try again.
      </p>

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        className="bg-white text-red-600 font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition"
      >
        Refresh
      </button>
    </div>
    );
  }

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();

        if (result?.isAuthenticated) {
          setUser(result?.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.error(error);
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) return <Loader />;

  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
