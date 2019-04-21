export enum OpError {
    NONE = 0x000,

    PREPARE_OP_ALREADY_EXIST = 0x011,
    PREPARE_DB_FAILED = 0x011,

    COMMIT_OP_CANNOT_FOUND = 0x021,
    COMMIT_OP_STATE_ERROR = 0x022,
    COMMIT_DB_FAILED = 0x023,

    ABORT_OP_CANNOT_FOUND = 0x031,
    ABORT_OP_STATE_ERROR = 0x032,
    ABORT_DB_FAILED = 0x033,

    ISSUE_NFT_ALREADY_EXIST = 0x111,
    ISSUE_NFT_ALREADY_TERMINATED = 0x112,
    ISSUE_DB_FAILED = 0x113,

    BURN_NFT_NOT_ALIVE = 0x121,
    BURN_DB_CREATE_NFTT_FAILED = 0x122,
    BURN_DB_DESTROY_NFT_FAILED = 0x123,
}
