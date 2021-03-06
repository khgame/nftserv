export enum OpError {
    NONE = 0x000,
    NFT_NOT_ALIVE = 0x001,
    NFT_ARE_HOLD_BY_OTHER_SERVICE = 0x002,

    PREPARE_OP_ALREADY_EXIST = 0x011,
    PREPARE_DB_FAILED = 0x012,
    PREPARE_DB_TRY_TIME_OUT_FAILED = 0x013,

    COMMIT_OP_CANNOT_FOUND = 0x021,
    COMMIT_OP_STATE_ERROR = 0x022,
    COMMIT_DB_FAILED = 0x023,

    ABORT_OP_CANNOT_FOUND = 0x031,
    ABORT_OP_STATE_ERROR = 0x032,
    ABORT_DB_FAILED = 0x033,

    ISSUE_NFT_ALREADY_EXIST = 0x111,
    ISSUE_NFT_ALREADY_TERMINATED = 0x112,
    ISSUE_DB_FAILED = 0x113,

    BURN_DB_CREATE_TERMINATED_NFT_FAILED = 0x121,
    BURN_DB_DESTROY_NFT_FAILED = 0x122,

    TRANSFER_NFT_ARE_NOT_BELONG_TO_THE_USER = 0x131,
    TRANSFER_CANNOT_TRANSFER_NFT_TO_ITS_OWNER = 0x132,
    TRANSFER_DB_FAILED = 0x133,

    UPDATE_DB_FAILED = 0x141,

    HOLD_DB_FAILED = 0x151,

    RELEASE_NFT_ARE_NOT_HOLD = 0x161,
    RELEASE_DB_FAILED = 0x162,
}

export enum OpCode {
    NONE = 0,
    ISSUE = 1,
    BURN = 2,
    UPDATE = 3,
    TRANSFER = 4,
    HOLD = 5,
    RELEASE = 6,
}

export enum OpStatus {
    INITIALED = 0,
    PREPARED = 1,
    COMMITTED = 2,
    ABORTED = 11,
    TIMEOUT = 12,
}

export interface IIssueParams {
    owner_id: string;
    logic_mark: string;
    data: any;
}

export interface IBurnParams {

}

export interface IHoldParams {

}

export interface IReleaseParams {

}

export interface IUpdateParams {
    data: any;
}

export interface ITransferParams {
    from: any;
    to: any;
    memo: any;
}
