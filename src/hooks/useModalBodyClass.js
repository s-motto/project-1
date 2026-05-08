import { useEffect } from "react";

let openCount = 0;

const useModalBodyClass = () => {
  useEffect(() => {
    openCount++;
    document.body.classList.add("modal-open");

    return () => {
      openCount--;
      if (openCount === 0) {
        document.body.classList.remove("modal-open");
      }
    };
  }, []);
};

export default useModalBodyClass;
