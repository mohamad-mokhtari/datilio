import {
    HiOutlineColorSwatch,
    HiOutlineDesktopComputer,
    HiOutlineTemplate,
    HiOutlineViewGridAdd,
    HiOutlineHome,
    HiOutlineUpload,
    HiOutlineTable,
    HiOutlineChat,
    HiOutlineCreditCard,
    HiOutlineCurrencyDollar,
    HiOutlineCog,
    HiOutlineChatAlt,
} from 'react-icons/hi'
import { FaCogs } from "react-icons/fa";
import { BsCardList } from "react-icons/bs";


export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    dashboard: <HiOutlineViewGridAdd />,
    uploadCsv: <HiOutlineUpload />,
    showCsv: <HiOutlineTable />,
    generateSyntheticData: <FaCogs />,
    userLists: <BsCardList />,
    talkToData: <HiOutlineChat />,
    ruleCenter: <HiOutlineCog />,
    pricing: <HiOutlineCurrencyDollar />,
    billing: <HiOutlineCreditCard />,
    feedback: <HiOutlineChatAlt />,
}

export default navigationIcon
