import { t, TFunction } from "i18next";
import { createContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
const LocalizationContext = createContext<TFunction>(t);

export default LocalizationContext;
