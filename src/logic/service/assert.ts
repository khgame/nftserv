type StringMethod = () => string;

export function ok<T>(condition: T, msg: string | Error | StringMethod) {
    if (!condition) {
        if (msg as StringMethod) {
            throw new Error((msg as StringMethod)());
        } else if (msg as string) {
            throw new Error(msg as string);
        } else {
            throw msg as Error;
        }
    }
}

export function sEqual<T>(a: T, b: T, msg: string | Error | StringMethod) {
    return ok(a === b, msg);
}

export function sNotEqual<T>(a: T, b: T, msg: string | Error | StringMethod) {
    return ok(a !== b, msg);
}



