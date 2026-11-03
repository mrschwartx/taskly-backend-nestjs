export interface TokenClaims {
  userId: string;
}

export abstract class TokenService {
  abstract issue(claims: TokenClaims): string;
  abstract verify(token: string): TokenClaims;
}
