import { useEffect, useState } from "react";
import { searchUserList } from "../api/getUserList.ts";
import HeaderList from "./HeaderList.jsx";

const SearchList = ({ by, search, onClick }) => {
  const [userList, setUserList] = useState(null);
  useEffect(() => {
    searchUserList(by, search).then((users) => {
      setUserList(users || []);
    });
  }, [by, search]);

  if (userList == null || (userList?.length | 0) === 0) return null;
  return <HeaderList userList={userList} onClick={onClick} />;
};

export default SearchList;
