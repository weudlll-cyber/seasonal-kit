export declare function websiteSignInHref(signInPath: string, page?: string): string;
export declare function websiteLoginHref(signInPath: string, page?: string): string;
export declare function signInAgain(signInPath: string, go?: (href: string) => void): boolean;
export declare function signInAgainAfter(response: Pick<Response, 'headers'>, header: string, go?: (href: string) => void): boolean;
