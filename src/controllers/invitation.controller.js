import { HttpStatusCode } from '*/utilities/constants';
import { InvitationService } from '*/services/invitation.service';

const createNewBoardInvitation = async (req, res) => {
    try {
        const userId = req.jwtDecoded._id;
        const result = await InvitationService.createNewBoardInvitation(req.body, userId);
        res.status(HttpStatusCode.OK).json(result);
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER).json({
            errors: error.message,
        });
    }
};

const getInvitation = async (req, res) => {
    try {
        const userId = req.jwtDecoded._id;
        const result = await InvitationService.getInvitation(userId);
        res.status(HttpStatusCode.OK).json(result);
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER).json({
            errors: error.message,
        });
    }
};

const updateBoardInvitation = async (req, res) => {
    try {
        const userId = req.jwtDecoded._id;
        const { invitationId } = req.params;
        const { action } = req.body;
        console.log('action: ', action);
        const result = await InvitationService.updateBoardInvitation(userId, invitationId, action);
        res.status(HttpStatusCode.OK).json(result);
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER).json({
            errors: error.message,
        });
    }
};

export const InvitationController = {
    createNewBoardInvitation,
    getInvitation,
    updateBoardInvitation,
};
