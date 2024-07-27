export class Ctx {
    private syms = new InternMap<Sym, string>();

    public addSym(ident: string): Sym {
        return this.syms.insert(ident);
    }
}

export type DefId = number & { readonly tag: unique symbol };
export const DefId = (v: number) => v as DefId;

export type LocalDefId = number & { readonly tag: unique symbol };
export const LocalDefId = (v: number) => v as LocalDefId;

export type ItemLocalId = number & { readonly tag: unique symbol };
export const ItemLocalId = (v: number) => v as ItemLocalId;

export type HirId = number & { readonly tag: unique symbol };
export const HirId = (v: number) => v as HirId;

export type Sym = number & { readonly tag: unique symbol };
export const Sym = (v: number) => v as Sym;

export class InternMap<Idx, Value> {
    private keyValueMap = new Map<Idx, Value>();
    private valueKeyMap = new Map<Value, Idx>();
    private nextId = 0;

    public insert(value: Value): Idx {
        if (this.valueKeyMap.has(value)) {
            return this.valueKeyMap.get(value)!;
        }
        const id = this.nextId as Idx;
        this.keyValueMap.set(id, value);
        this.valueKeyMap.set(value, id);
        return id;
    }
}
