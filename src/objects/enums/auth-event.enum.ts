export enum AuthEventType {
    FIND_ONE_BY_ID = 'auth.findOneById',
    FIND_ONE_BY_EMAIL = 'auth.findOneByEmail',
    NEED_USER_CREATION = 'auth.needUserCreation',
    SET_REFRESH_TOKEN = 'auth.setRefreshToken'
}