import { UserModel } from '*/models/user.model';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { SendInBlueProvider } from '*/providers/SendInBlueProvider';
import { CloudinaryProvider } from '*/providers/CloudinaryProvider';
import { WEBSITE_DOMAIN } from '*/utilities/constants';
import { pickUser } from '../utilities/transform';
import { JwtProvider } from '../providers/JwtProvider';
import { env } from '../config/environtment';
import { CardModel } from '*/models/card.model';
import { RedisQueueProvider } from '*/providers/RedisQueueProvider';

const createNew = async (data) => {
    try {
        //Kiểm tra email đã tồn tại chưa
        const existEmail = await UserModel.findOneByEmail(data.email);
        if (existEmail) {
            throw new Error('Email already exitst');
        }

        //Tạo data lưu user vào DB
        const nameFromEmail = data.email.split('@')[0] || '';

        const userData = {
            email: data.email,
            password: bcryptjs.hashSync(data.password, 8),
            username: nameFromEmail,
            displayName: nameFromEmail,
            verifyToken: uuidv4(),
        };

        const createdUser = await UserModel.createNew(userData);
        const getUser = await UserModel.findOneById(createdUser.insertedId.toString());

        const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getUser.email}&token=${getUser.verifyToken}`;
        const subject = 'Trello Clone App: Please verify your email before using our services!';
        const htmlContent = `
         <h3>Here is your verification link:</h3>
         <h3>${verificationLink}</h3>
         <h3>Sincerely,<br/> - Trungquandev Official - </h3>
        `;
        await SendInBlueProvider.sendEmail(getUser.email, subject, htmlContent);
        console.log('getUser: ', getUser);

        return pickUser(getUser);
    } catch (error) {
        throw new Error(error);
    }
};

const verifyAccount = async (data) => {
    try {
        const existUser = await UserModel.findOneByEmail(data.email);
        if (!existUser) {
            throw new Error('Your email is not exist');
        }

        if (existUser.isActive) {
            throw new Error('Your account is already active!');
        }

        const updateData = {
            verifyToken: null,
            isActive: true,
        };

        const updatedUser = await UserModel.update(existUser._id.toString(), updateData);
        return pickUser(updatedUser);
    } catch (error) {
        throw new Error(error);
    }
};

const signIn = async (data) => {
    try {
        const existUser = await UserModel.findOneByEmail(data.email);

        if (!existUser) {
            throw new Error('Can not find your email');
        }

        if (!existUser.isActive) {
            throw new Error('Your account is not active');
        }

        if (!bcryptjs.compareSync(data.password, existUser.password)) {
            throw new Error('Your password is incorrect!');
        }

        const userInfoToStoreJwtToken = {
            _id: existUser._id,
            email: existUser.email,
        };

        //Xử lý tokes
        const accessToken = await JwtProvider.generateToken(
            env.ACCESS_TOKEN_SECRET_SIGNATURE,
            env.ACCESS_TOKEN_SECRET_LIFE,
            userInfoToStoreJwtToken
        );

        const refreshToken = await JwtProvider.generateToken(
            env.REFRESH_TOKEN_SECRET_SIGNATURE,
            env.REFRESH_TOKEN_SECRET_LIFE,
            userInfoToStoreJwtToken
        );

        return { accessToken, refreshToken, ...pickUser(existUser) };
    } catch (error) {
        throw new Error(error);
    }
};

const refreshToken = async (clientRefreshToken) => {
    try {
        const refreshTokenDecoded = await JwtProvider.verifyToken(
            env.REFRESH_TOKEN_SECRET_SIGNATURE,
            clientRefreshToken
        );

        const userInfoToStoreJwtToken = {
            _id: refreshTokenDecoded._id,
            email: refreshTokenDecoded.email,
        };

        const accessToken = await JwtProvider.generateToken(
            env.ACCESS_TOKEN_SECRET_SIGNATURE,
            env.ACCESS_TOKEN_SECRET_LIFE,
            userInfoToStoreJwtToken
        );

        return { accessToken };
    } catch (error) {
        console.log('service:', error);
        throw new Error(error);
    }
};

const update = async (userId, data, avatarFile) => {
    try {
        let updatedUser = {};
        let shouldUpdateCardsComments = false;

        if (avatarFile) {
            const uploadResult = await CloudinaryProvider.streamUpload(avatarFile.buffer, 'user');

            updatedUser = await UserModel.update(userId, {
                avatar: uploadResult.secure_url,
            });

            shouldUpdateCardsComments = true;
        } else if (data.currentPassword && data.newPassword) {
            const existUser = await UserModel.findOneById(userId);
            if (!existUser) {
                throw new Error('User not found');
            }

            //Compare password
            if (!bcryptjs.compareSync(data.currentPassword, existUser.password)) {
                throw new Error('Your currentPassword is incorrect');
            }

            updatedUser = await UserModel.update(userId, { password: bcryptjs.hashSync(data.newPassword, 8) });
        } else {
            updatedUser = await UserModel.update(userId, data);

            if (data.displayName) {
                shouldUpdateCardsComments = true;
            }
        }

        // Background tasks: https://github.com/mkamrani/example-node-bull/blob/main/basic/index.js
        // Chạy background job cho việc cập nhật rất nhiều bản ghi comments thuộc về user đó.
        if (shouldUpdateCardsComments) {
            // Bước 1: Khởi tạo một cái hàng đợi để cập nhật toàn bộ comments của nhiều cái cards
            let updateCardsCommentsQueue = RedisQueueProvider.generateQueue('updateCardsCommentsQueue');

            // Bước 2: Định nghĩa ra những việc cần làm trong tiến trình hàng đợi
            updateCardsCommentsQueue.process(async (job, done) => {
                console.log('Bắt đầu chạy một hoặc nhiều công việc (Jobs) trong hàng đợi....');
                try {
                    // job.data ở đây chính là cái updatedUser được truyền vào ở bước 4
                    const cardCommentsUpdated = await CardModel.updateManyComments(job.data);
                    done(null, cardCommentsUpdated);
                } catch (error) {
                    done(new Error('Error from updateCardsCommentsQueue', error));
                }
            });

            // Bước 3: Check completed hoặc failed, tùy trường hợp yêu cầu mà cần cái event này, để bắn thông báo khi job chạy xong chẳng hạn
            // Nhiều event khác: https://github.com/OptimalBits/bull/blob/HEAD/REFERENCE.md#events
            updateCardsCommentsQueue.on('completed', (job, result) => {
                console.log(`Job với id là: ${job.id} và tên job: ${job.queue.name} đã xong với kết quả là: `, result);
            });
            updateCardsCommentsQueue.on('failed', (job, error) => {
                console.log(`Job với id là: ${job.id} và tên job: ${job.queue.name} đã bị lỗi: `, error);
                // Bắn lỗi về Slack hoặc Telegram...
            });

            // Bước 4: Bước quan trọng cuối cùng: Thêm vào hàng đợi Redis để xử lý
            updateCardsCommentsQueue.add(updatedUser, {
                attempts: 3, // Số lần thử lại nếu lỗi
                backoff: 3000, // Khoảng thời gian delay giữa các lần thử lại job
            });
        }

        return pickUser(updatedUser);
    } catch (error) {
        throw new Error(error);
    }
};

export const UserService = {
    createNew,
    verifyAccount,
    signIn,
    refreshToken,
    update,
};
