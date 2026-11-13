export interface SignUp {
  name: string;
  email: string;
  role: string;
  digest: boolean;
  updates: boolean;
}

export function submitSignUp(data: SignUp): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 800));
}
