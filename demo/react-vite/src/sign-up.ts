export interface SignUp {
  email: string;
  updates: boolean;
}

export function submitSignUp(data: SignUp): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 800));
}
