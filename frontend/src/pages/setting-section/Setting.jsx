import React, { useState } from "react";
import useThemeStore from "../../store/themeStore";
import { logoutUser } from "../../services/user.service";
import useUserStore from "../../store/useUserStore";
import { toast } from "react-toastify";
import Layout from "../../components/Layout";
import {
  FaComment,
  FaMoon,
  FaQuestionCircle,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import useLayoutStore from "../../store/layoutStore";

const Setting = () => {
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const { clearUser, user } = useUserStore();
  const { setSelectedContact } = useLayoutStore();

  const { theme } = useThemeStore();

  const toggleThemeDialog = () => {
    setIsThemeDialogOpen(!isThemeDialogOpen);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      setSelectedContact(null)

      toast.success("User logged out successfully");
    } catch (error) {
      console.log("Failed to logout", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={toggleThemeDialog}
    >
      <div
        className={`flex h-screen ${
          theme == "dark"
            ? "bg-[rgb(17,27,33)] text-white"
            : "bg-white text-black"
        }`}
      >
        <div
          className={`w-[400px] border-r ${
            theme === "dark" ? "border-gray-600" : "border-gray-200"
          }`}
        >
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-4">Settings</h1>

            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings"
                className={`w-full ${
                  theme == "dark"
                    ? "bg-[#202c33] text-white"
                    : "bg-gray-100 text-black"
                } border-none pl-10 placeholder-gray-400 rounded p-2`}
              />
            </div>

            <div
              className={`flex items-center gap-4 p-3 ${
                theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-100"
              } rounded-lg cursor-pointer `}
            >
              <img
                src={user?.profilePicture}
                alt="profile"
                className="w-12 h-12 rounded-full "
              />

              <div>
                <h2 className="font-semibold">{user?.username}</h2>
                <p className="text-sm text-gray-400  truncate">
                  {user?.about} jknhhgbjk nk
                </p>
              </div>
            </div>

            {/* menu items  */}

            <div className="h-full overflow-y-auto">
              <div className="space-y-0">
                {[
                  { icon: FaUser, lable: "Account", href: "/user-profile" },
                  { icon: FaComment, lable: "Chats", href: "/" },
                  { icon: FaQuestionCircle, lable: "Help", href: "/help" },
                ].map((item) => (
                  <Link
                    to={item.href}
                    key={item.lable}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 rounded ${
                      theme === "dark"
                        ? "text-white hover:bg-[#202c33] "
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <div
                      className={`border-b ${
                        theme == "dark" ? "border-gray-700" : "border-gray-200"
                      } w-full p-4`}
                    >
                      {item.lable}
                    </div>
                  </Link>
                ))}
                {/* theme button  */}

                <button
                  className={`w-full flex items-center gap-3 p-2 rounded ${
                    theme === "dark"
                      ? "text-white hover:bg-[#202c33] "
                      : "text-black hover:bg-gray-100"
                  } `}
                  onClick={toggleThemeDialog}
                >
                  {theme === "dark" ? (
                    <FaMoon className="h-5 w-5" />
                  ) : (
                    <FaSun className="h-5 w-5" />
                  )}

                  <div
                    className={`flex-col flex text-start border-b ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    } w-full p-2`}
                  >
                    Theme
                    <span className="ml-auto text-sm text-gray-400">
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </span>
                  </div>
                </button>
              </div>

              {/* logout button  */}

              <button
              onClick={handleLogout}
                className={`w-full mt-6 flex items-center gap-3 p-2 rounded text-red-500 $${
                  theme === "dark"
                    ? "text-white hover:bg-[#202c33] "
                    : "text-black hover:bg-gray-100"
                } `}
              >
                <FaSignOutAlt className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Setting;
4;
