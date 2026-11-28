export declare const CALL_SLOT: {
    readonly width: 338;
    readonly height: 190;
    readonly lowWidth: 267;
    readonly lowHeight: 100;
    readonly lowBelow: 760;
    readonly bar: 48;
};
export type CallSlotForm = 'picture' | 'low' | 'collapsed' | 'strip' | 'phone-picture';
export interface CallSlot {
    readonly form: CallSlotForm;
    readonly className: string;
    readonly width: number | null;
    readonly height: number | null;
}
export interface CallSlotInput {
    readonly callId: number | null;
    readonly phone: boolean;
    readonly collapsed: boolean;
    readonly windowHeight: number;
}
export declare function callSlot(input: CallSlotInput): CallSlot | null;
