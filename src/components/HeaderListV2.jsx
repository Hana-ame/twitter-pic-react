import Header from './HeaderV2.jsx';

const HeaderListV2 = ({ userList, onClick }) => {
    // 一种兼容性更好的检查方式是组合两种方法
    if (userList === null || (typeof userList !== 'object' && !Array.isArray(userList))) {
        return <div>Loading...</div>;
    }

    return <>
        {userList.map(user => <Header key={user.username} user={user} onClick={onClick} />)}
    </>

};

export default HeaderListV2;