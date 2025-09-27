import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx"
import Header from "./Header.jsx"


const FavList = ({ onClick }) => {
    const [favMap] = useLocalStorage("fav-map", {})

    return <>
        {Object.keys(favMap).map(username => <Header key={username} username={username} onClick={onClick} />)}
    </>
}

export default FavList; 