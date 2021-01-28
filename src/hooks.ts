import * as React from "react";
import { srpLogin, TAuthStep, TSrpLoginParams } from "franken-srp";

import { UsernamePasswordObject } from "./components/username-password";

type TAuthResponse = Required<TAuthStep>["response"];

export type SignInEvents = {
  onComplete: (response: TAuthResponse) => void;
  onError: (error: Error) => void;
};

export type SignInSRP = {
  initial?: Partial<UsernamePasswordObject>;
  cognito: Omit<TSrpLoginParams, "username" | "password" | "device">;
  deviceForUsername: (username: string) => TSrpLoginParams["device"];
  customGenerator?: typeof srpLogin;
};

export const useAuthStep = ({ onComplete, onError }: SignInEvents) => {
  const [step, setStep] = React.useState<TAuthStep | undefined>();
  return {
    step,
    setStep: (newStep: TAuthStep | undefined) => {
      setStep(newStep);
      if (newStep?.code === "TOKENS" && newStep.response) {
        onComplete(newStep.response);
      }
      if (newStep?.error) {
        onError(newStep.error);
      }
    },
  };
};
export const useSRP = ({
  initial,
  cognito,
  customGenerator,
  deviceForUsername,
  setStep,
}: SignInSRP & { setStep: (step: TAuthStep) => void }) => {
  const [loading, setLoading] = React.useState(false);
  const [generator, setGenerator] = React.useState<
    ReturnType<typeof srpLogin>
  >();
  const start = async ({ username, password }: UsernamePasswordObject) => {
    setLoading(true);
    const device = deviceForUsername(username);
    const newGenerator = (customGenerator || srpLogin)({
      ...cognito,
      username,
      password,
      device,
    });
    const result = await newGenerator.next();
    setGenerator(newGenerator);
    setStep(result.value);
    setLoading(false);
  };
  const next = async ({ code }: { code?: string }) => {
    setLoading(true);
    if (generator) {
      const result = await (code ? generator.next(code) : generator.next());
      setStep(result.value);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    if (initial?.username && initial?.password) {
      start({ username: initial.username, password: initial.password });
    }
  }, [initial?.username, initial?.password]);

  return {
    start,
    next,
    loading,
  };
};
