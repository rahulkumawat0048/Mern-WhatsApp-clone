import React from "react";
import Layout from "../../components/Layout";
import { motion } from "framer-motion";
import useThemeStore from "../../store/themeStore";
import { FaClock, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Status = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const isDark = theme === "dark";

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-full min-h-screen flex items-center justify-center border-r
        ${
          isDark
            ? "bg-[rgb(17,27,33)] border-gray-700 text-white"
            : "bg-gray-100 border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex flex-col items-center text-center max-w-md px-6">
          {/* Icon */}
          <div
            className={`w-20 h-20 flex items-center justify-center rounded-full mb-6
            ${isDark ? "bg-gray-700" : "bg-white shadow-md"}`}
          >
            <FaClock className="text-3xl text-green-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold mb-2">
            Status Not Available
          </h1>

          {/* Description */}
          <p
            className={`text-sm mb-6 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            This feature is currently under development.
            We’re working hard to bring it to you soon.
          </p>

          {/* Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2 rounded-full
            bg-green-500 hover:bg-green-600 hover:scale-110 text-white transition"
          >
            <FaArrowLeft />
            Go Back
          </button>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Status;
