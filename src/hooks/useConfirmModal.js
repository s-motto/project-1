import { useState } from "react";

const useConfirmModal = (initialExtra = {}) => {
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    ...initialExtra,
  });

  const openConfirm = (type, extra = {}) => {
    setConfirmModal({ isOpen: true, type, ...extra });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false, type: null, ...initialExtra });
  };

  return { confirmModal, openConfirm, closeConfirm };
};

export default useConfirmModal;
