"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUserId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUserId = (0, common_1.createParamDecorator)((_data, context) => {
    const request = context.switchToHttp().getRequest();
    return request.authUser.userId;
});
//# sourceMappingURL=authenticated-user.decorator.js.map