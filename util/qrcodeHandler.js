import QRCode from 'qrcode'

const generateQRCode = async (value) => {
  try {
    const base64Image = await QRCode.toDataURL(value);
    //console.log(base64Image);
    return base64Image.toString();
  } catch (err) {
    console.error(err);
    return ""
  }
};

export default generateQRCode
