import Joi from 'joi';
import { ObjectId } from 'mongodb';
import { getDB } from '*/config/mongodb';

// Define User collection
const userCollectionName = 'users';
const userCollectionSchema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
    username: Joi.string().required().trim(), // username sẽ không limit vì sẽ có những duôi email từ các nhà cung câp khác nhau

    displayName: Joi.string().required().trim(),
    avatar: Joi.string().default(null),

    role: Joi.string().default('client'),

    isActive: Joi.boolean().default(false),
    verifyToken: Joi.string(),

    createdAt: Joi.date().timestamp('javascript').default(Date.now),
    updatedAt: Joi.date().timestamp().default(null),
});

const INVALID_UPDATE_FIELDS = ['_id', 'email', 'username', 'createdAt'];

const validateSchema = async (data) => {
    return await userCollectionSchema.validateAsync(data, { abortEarly: false });
};
// Used
const findOneById = async (id) => {
    try {
        const result = await getDB()
            .collection(userCollectionName)
            .findOne({ _id: ObjectId(id) });
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

// Used
const findOneByEmail = async (email) => {
    try {
        const result = await getDB().collection(userCollectionName).findOne({ email: email });
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

// Used
const createNew = async (data) => {
    try {
        const validatedValue = await validateSchema(data);
        const insertValue = {
            ...validatedValue,
            boardId: ObjectId(validatedValue.boardId),
            columnId: ObjectId(validatedValue.columnId),
        };
        const result = await getDB().collection(userCollectionName).insertOne(insertValue);
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

const update = async (id, data) => {
    try {
        const updateData = { ...data };
        if (data.boardId) updateData.boardId = ObjectId(data.boardId);
        if (data.columnId) updateData.columnId = ObjectId(data.columnId);

        const result = await getDB()
            .collection(userCollectionName)
            .findOneAndUpdate({ _id: ObjectId(id) }, { $set: updateData }, { returnDocument: 'after' });
        return result.value;
    } catch (error) {
        throw new Error(error);
    }
};

export const UserModel = {
    userCollectionName,
    createNew,
    update,
    findOneById,
    findOneByEmail,
};
