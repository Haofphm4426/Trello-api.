import multer from 'multer';

const LIMIT_COMMON_FILE_SIZE = 10485760; // byte = 10 MB
const ALLOW_COMMON_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png'];

const customFilter = (req, file, callback) => {
    if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
        const errMessage = 'File type is invalid';
        return callback(errMessage, null);
    }
    return callback(null, true);
};

const upload = multer({
    limit: { fileSize: LIMIT_COMMON_FILE_SIZE },
    fileFilter: customFilter,
    // storage: multer.diskStorage({
    //     destination: (req, file, callback) => {
    //         // Định nghĩa nơi file upload sẽ được lưu lại
    //         callback(null, 'uploads');
    //     },
    // }),
});

export const UploadMiddleware = {
    upload,
};
