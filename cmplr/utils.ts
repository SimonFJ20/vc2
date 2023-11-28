export function leftPad(
    value: string,
    minLength: number,
    replacer = " ",
): string {
    while (value.length < minLength) {
        value = replacer + value;
    }
    return value;
}

export type Option<T> = { ok: true; value: T } | { ok: false };
export const Some = <T>(value: T): Option<T> => ({ ok: true, value });
export const None = <T>(): Option<T> => ({ ok: false });
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const Ok = <T, E>(value: T): Result<T, E> => ({ ok: true, value });
export const Err = <T, E>(error: E): Result<T, E> => ({ ok: false, error });

export const mapResult = <T, E, N>(
    result: Result<T, E>,
    functor: (value: T) => Result<N, E>,
): Result<N, E> => {
    return result.ok ? functor(result.value) : result;
};

export interface Iter<T> {
    next(): Option<T>;
}

export function iterate<T>(iterator: Iter<T>) {
    return {
        [Symbol.iterator](): Iterator<T> {
            return {
                next(): IteratorResult<T> {
                    const value = iterator.next();
                    if (value.ok) {
                        return { value: value.value };
                    } else {
                        return { value: undefined, done: true };
                    }
                },
            };
        },
    };
}

export function contains<T>(v: T, vs: readonly T[]): boolean {
    for (const c of vs) {
        if (c === v) {
            return true;
        }
    }
    return false;
}

export function range(length: number): number[] {
    return new Array(length).fill(0).map((_, i) => i);
}

export function assertExhausted(value: never): never {
    throw new Error("unexhausted");
}
