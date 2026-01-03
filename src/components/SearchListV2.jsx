import { useEffect, useState } from "react";
import { searchUserList } from "../api/getUserList.ts";
import HeaderList from "./HeaderListV2.jsx";

const SearchListV2 = ({ by, search, onClick, setResults }) => {
  const [userList, setUserList] = useState(null);
  useEffect(() => {
    setResults?.(0);
    searchUserList(by, search).then((users) => {
      setUserList(users);
      setResults?.(users.length);
    });
  }, [by, search]);

  return <HeaderList userList={userList || []} onClick={onClick} />;
};

export default SearchListV2;
