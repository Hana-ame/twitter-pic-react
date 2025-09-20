import Header from './Header.jsx';

const HeaderList = ({ userList, onClick }) => {
    // 一种兼容性更好的检查方式是组合两种方法
    if (userList === null || (typeof userList !== 'object' && !Array.isArray(userList))) {
        return <div>Loading...</div>;
    }

    return <>
        {userList.map(username => <Header key={username} username={username} onClick={onClick} />)}
    </>

};

export default HeaderList;