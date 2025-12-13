import { t, TFunction } from "i18next";
import { createContext } from "react";

const LocalizationContext = createContext<TFunction>(t);

export default LocalizationContext;
