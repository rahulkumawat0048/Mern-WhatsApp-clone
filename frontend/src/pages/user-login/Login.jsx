import React, { useState } from 'react';
import useLoginStore from '../../store/useLoginStore';
import countries from '../../utils/countriles'; // fixed misspelling
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/useUserStore';
import { useForm } from 'react-hook-form';
import useThemeStore from '../../store/themeStore';
import { motion } from "framer-motion";
import { FaArrowLeft, FaChevronDown, FaUser, FaWhatsapp, FaPlus } from 'react-icons/fa';
import Spinner from "../../utils/Spinner";
import { sendOtp, updateUserProfile, verifyOtp } from '../../services/user.service';
import { toast } from 'react-toastify';


// validation schema
const loginValidationSchema = yup
  .object()
  .shape({
    // accept digits only (you can tweak to allow + if you want)
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^[0-9]+$/, "Phone number must contain digits only")
      .transform((value, originalValue) => (originalValue.trim() === "" ? null : value)),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email")
      .transform((value, originalValue) => (originalValue.trim() === "" ? null : value)),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value?.phoneNumber || value?.email);
    }
  );

const otpValidationSchema = yup.object().shape({
  otp: yup.string().length(6, "OTP must be exactly 6 digits").required("OTP is required")
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  agreed: yup.bool().oneOf([true], "You must agree to the terms")
});

const avatars = [
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
];

const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } = useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false)


  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors }
  } = useForm({
    resolver: yupResolver(loginValidationSchema)
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue
  } = useForm({
    resolver: yupResolver(otpValidationSchema)
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch
  } = useForm({
    resolver: yupResolver(profileValidationSchema)
  });

  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(country.dialCode).includes(searchTerm)
  );

  const ProgressBar = () => (
    <div className={`w-full ${theme === "dark" ? "bg-gray-700 " : "bg-gray-200"} rounded-full h-2.5 mb-6`} >
      <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out "
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  const onLoginSubmit = async (formValues) => {
    try {
      setLoading(true);
      setError("");
      // prefer formValues from react-hook-form; fallback to local state
      const emailToUse = formValues?.email ?? email;
      const phoneToUse = formValues?.phoneNumber ?? phoneNumber;

      if (emailToUse) {
        const response = await sendOtp(null, null, emailToUse);
        if (response.status === 'success') {
          toast.info('OTP is sent to your email');
          setUserPhoneData({ email: emailToUse });
          setStep(2);
          
        } else {
          throw new Error(response.message || 'Failed to send OTP to email');
        }
      } else {
        const response = await sendOtp(phoneToUse, selectedCountry.dialCode);
        if (response.status === 'success') {
          toast.info('OTP is sent to your phone number');
          setUserPhoneData({ phoneNumber: phoneToUse, phoneSuffix: selectedCountry.dialCode });
          setStep(2);
        } else {
          throw new Error(response.message || 'Failed to send OTP to phone');
        }
      }
    } catch (err) {
      console.log(err);
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      if (!userPhoneData) {
        throw new Error("Phone or email data is missing");
      }

      const otpString = otp.join("");
      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, otpString, userPhoneData?.email);
      } else {
        response = await verifyOtp(userPhoneData.phoneNumber, userPhoneData.phoneSuffix, otpString);
      }

      if (response.status === 'success') {
        toast.success('OTP verified successfully');
        const user = response.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Welcome back to Whatsapp");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  // Fixed file input handler: use e.target.files[0]
  const handleFileChange = (e) => {
    const file = e?.target?.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('agreed', data.agreed);

      if (profilePictureFile) {
        // append actual file from state
        formData.append('media', profilePictureFile);
      } else {
        formData.append('profilePicture', selectedAvatar);
      }

      const response = await updateUserProfile(formData);
      if (response?.status === 'success') {
        toast.success("Profile updated — Welcome!");
        navigate('/');
        resetLoginState();
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to update user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // only allow digits
    const sanitized = value.replace(/\D/g, '').slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = sanitized;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (sanitized && index < 5) {
      const nextEl = document.getElementById(`otp-${index + 1}`);
      if (nextEl) nextEl.focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className={`min-h-screen 
      ${theme === 'dark'
        ? "bg-gray-900"
        : "bg-gradient-to-br from-green-400 to-blue-500"
      } 
      flex items-center justify-center p-4 overflow-y-hidden`}>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${theme === 'dark' ? "bg-gray-800 text-white" : "bg-white"}  p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10 `}
      >

        {/* whatsapp icon  */}
        <motion.div
          initial={{ scale: 0, }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className={`w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center`}
        >
          <FaWhatsapp className='w-16 h-16 text-white' />
        </motion.div>

        {/* heading  */}
        <h1 className={`text-3xl font-bold text-center mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>WhatsApp Login</h1>

        {/* progress bar  */}
        <ProgressBar />

        {error && <p className='text-red-500 text-center mb-4'>{error}</p>}

        {/* step 1  */}
        {step === 1 && (
          <form
            className='space-y-4'
            onSubmit={handleLoginSubmit(onLoginSubmit)}
          >
            <p className={`text-center ${theme === 'dark' ? "text-gray-300 " : "text-gray-600"} mb-4`}>
              Enter your phone number to receive an OTP
            </p>

            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type='button'
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${theme === 'dark' ? 'text-white bg-gray-700 border-gray-600 ' : "text-gray-900 bg-gray-100 border-gray-300"} border rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 space-x-1`}
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown />
                  </button>

                  {/* show dropdown  */}
                  {showDropdown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 ' : 'bg-white border-gray-300'} border rounded-md shadow-lg max-h-60 overflow-auto`}>
                      <div className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} p-2`}>
                        <input type="text"
                          placeholder='Search countries...'
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-2 py-1 border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : "bg-white border-gray-300"} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500  `}
                        />
                      </div>
                      {filterCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type='button'
                          className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-gray-600 ' : 'hover:bg-gray-100'} focus:outline-none focus:bg-gray-100`}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropdown(false);
                          }}
                        >
                          {country.flag} ({country.dialCode}) {country.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input type="text"
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  placeholder='Phone Number'
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full sm:ms-2 px-4 py-2 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}  rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${loginErrors.phoneNumber ? 'border-red-500' : ''}`}
                />
              </div>
              {loginErrors.phoneNumber && (
                <p className='text-red-500 text-sm'>{loginErrors.phoneNumber.message}</p>
              )}
            </div>

            {/* divider with or  */}
            <div className='flex items-center my-4'>
              <div className="flex-grow h-px bg-gray-300"></div>
              <span className="mx-3 text-gray-500 text-sm font-medium ">or</span>
              <div className="flex-grow h-px bg-gray-300"></div>
            </div>

            {/* email input box */}
            <div className={`focus-within:ring-2 focus-within:ring-green-500 flex items-center border rounded-md px-3 py-2 ${theme === 'dark' ? "bg-gray-700 border-gray-600" : 'bg-white border-gray-300'}`}>
              <FaUser className={`mr-2 text-gray-400 ${theme === 'dark' ? "text-gray-400" : "text-gray-500"}`} />

              <input type="email"
                {...loginRegister("email")}
                value={email}
                placeholder='Email (optional)'
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-transparent focus:outline-none ${theme === 'dark'
                  ? ' text-white'
                  : 'text-black'} 
                  ${loginErrors.email ? 'border-red-500' : ''}`}
              />

              {loginErrors.email && (
                <p className='text-red-500 text-sm'>{loginErrors.email.message}</p>
              )}
            </div>

            {/* button  */}
            <button
              type='submit'
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition">
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}

        {/* step 2 */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className='space-y-4'>
            <p
              className={`text-center ${theme === 'dark' ? 'text-gray-300' : "text-gray-600"} mb-4`}>
              Please enter the 6-digit OTP sent to your {userPhoneData?.email ? 'Email' : 'phone'} {" "}
              {userPhoneData?.phoneNumber ?? ""}
            </p>

            <div className="flex justify-between">
              {otp.map((digit, index) => (
                <input type="text" key={index} id={`otp-${index}`} maxLength={1} value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className={`w-12 h-12 text-center border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500  ${otpErrors.otp ? "border-red-500" : ""}  `}
                />
              ))}
            </div>

            {otpErrors.otp && (
              <p className='text-red-500 text-sm'>{otpErrors.otp.message}</p>
            )}

            {/* button  */}
            <button
              type='submit'
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition">
              {loading ? <Spinner /> : "Verify OTP"}
            </button>

            <button
              type='button'
              onClick={handleBack}
              className={`w-full mt-2  ${theme === 'dark' ? "bg-gray-600 text-gray-300" : 'bg-gray-200 text-gray-700'} py-2 rounded-md hover:border-gray-300 transition flex items-center justify-center `}
            >
              <FaArrowLeft className='mr-2' />
              Wrong number? Go back
            </button>
          </form>
        )}

        {/* step 3 (profile) - minimal UI kept; if you want the full profile UI restored I can add it */}
        {step === 3 && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className='space-y-4'>

            <div className="flex flex-col items-center mb-4">
              <div className="relative w-20 h-20 mb-2">
                <img src={profilePicture || selectedAvatar}
                  alt="profile"
                  className='w-full h-full rounded-full object-cover'
                />
                <label htmlFor="profile-picture" className='absolute bottom-0 right-0-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600'>
                  <FaPlus className="w-4 h-4" />
                </label>

                <input type="file"
                  id='profile-picture'
                  accept='image/*'
                  onChange={handleFileChange}
                  className='hidden'
                />
              </div>
              <p className={`text-sm  ${theme === 'dark' ? "text-gray-300 " : "text-gray-500"} mb-2 `}> Choose an avatar</p>

              {/* choose avatar  */}
              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avatar, index) => (
                  <img src={avatar}
                    onClick={() => setSelectedAvatar(avatar)}
                    alt={`Avatar ${index + 1}`}
                    key={index}
                    className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 ${selectedAvatar === avatar ? 'ring-2 ring-green-500' : ""}`}

                  />

                ))}
              </div>
            </div>

            <div className="relative">
              <FaUser className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme == 'dark' ? 'text-gray-400' : 'text-gray-400'}`}
              />
              <input type="text"
                {...profileRegister("username")}
                placeholder='Username'
                className={`w-full pl-10 pr-3 py-2 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
              />

              {profileErrors.username && (
                <p className='text-red-500 text-sm'>{profileErrors.username.message}</p>
              )}


            </div>

            <div className="flex items-center space-x-2">
              <input
                {...profileRegister('agreed')}
                type="checkbox"
                className={`rounded ${theme === 'dark' ? 'text-green-500 bg-gray-700' : "text-green-500"} focus:ring-green-500 `}

              />
              <label htmlFor="terms"
                className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                I agree to the {" "}
                <a href='#'
                  className='text-red-500 hover:underline'
                >Terms and Conditions</a>

              </label>

              {profileErrors.agreed && (
                <p className='text-red-500 text-sm'>{profileErrors.agreed.message}</p>
              )}

            </div>

            {/* button  */}
            <button
              type='submit'
              disabled={!watch("agreed") || loading}
              className={`w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 items-center justify-center text-lg
                ${loading ? "opacity-50 cursor-not-allowed" : ""}
              `}>
              {loading ? <Spinner /> : "Create Profile"}
            </button>


          </form>
        )}

      </motion.div>
    </div>
  );
};

export default Login;
