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
    HiOutlineChip,
    HiOutlineAdjustments,
} from 'react-icons/hi'
import { FaCogs } from "react-icons/fa";
import { BsCardList } from "react-icons/bs";
import { 
    Settings, 
    Database, 
    Wrench, 
    Filter,
    BarChart3,
    MessageSquare
} from 'lucide-react';


export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    dashboard: <HiOutlineViewGridAdd />,
    uploadCsv: <HiOutlineUpload />,
    showCsv: <HiOutlineTable />,
    dataProcessing: <Database />,
    generateSyntheticData: <BarChart3 />,
    userLists: <BsCardList />,
    talkToData: <MessageSquare />,
    ruleCenter: <Settings />,
    pricing: <HiOutlineCurrencyDollar />,
    billing: <HiOutlineCreditCard />,
    feedback: <HiOutlineChatAlt />,
}

export default navigationIcon
