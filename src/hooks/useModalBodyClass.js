import { useEffect } from "react";

const useModalBodyClass = () => {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);
};

export default useModalBodyClass;
