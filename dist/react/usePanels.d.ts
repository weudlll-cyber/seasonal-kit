export interface Panels<Id extends string = string> {
    readonly open: Id | null;
    readonly toggle: (id: Id) => void;
    readonly close: () => void;
    readonly button: (id: Id) => (el: HTMLButtonElement | null) => void;
}
export declare function usePanels<Id extends string = string>(): Panels<Id>;
