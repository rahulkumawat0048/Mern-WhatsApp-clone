import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken)

// send otp to phone number 
export const sendOtpToPhoneNumber = async (phoneNumber) => {
    try {
        console.log('seding otp to this number', phoneNumber)
        if (!phoneNumber) {
            throw new Error('phone number is required')
        }
        const response = await client.verify.v2.services(serviceSid).verifications.create({
            to: phoneNumber,
            channel: 'sms'
        })
        console.log('this is my otp response')
        return response
    } catch (error) {
        console.log(error)
        throw new Error('failed to send otp')
    }
}

export const verifyOtpService = async (phoneNumber,otp) => {
    try {
        console.log('this is myotp',otp)
        const response = await client.verify.v2.services(serviceSid).verificationChecks.create({
            to: phoneNumber,
            code: otp
        })
        console.log('this is my otp response')
        return response
    } catch (error) {
        console.log(error)
        throw new Error('otp verification failed')
    }
}

