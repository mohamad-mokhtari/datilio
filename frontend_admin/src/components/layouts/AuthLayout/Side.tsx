import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'
import type { CommonProps } from '@/@types/common'

interface SideProps extends CommonProps {
    content?: React.ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div className="grid lg:grid-cols-3 h-full">
            {/* LEFT COLUMN */}
            <div
                className="hidden lg:flex flex-col bg-no-repeat bg-cover py-6 px-16"
                style={{
                    backgroundImage: `url('/img/others/auth-side-bg.jpg')`,
                }}
            >
                {/* logo stays naturally at the top */}
                <Logo mode="dark" />

                {/* promo text is centred vertically */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            Transform Your Data Into Insights
                        </h2>
                        <p className="text-lg text-white opacity-90 leading-relaxed">
                            Datilio is your comprehensive data analytics platform that empowers
                            businesses to unlock the full potential of their data. From advanced
                            visualizations to intelligent insights, make data-driven decisions
                            with confidence.
                        </p>

                        {/* <div className="mt-8 grid grid-cols-2 gap-6 text-center">
                    <div className="text-white">
                        <div className="text-3xl font-bold text-blue-300">📊</div>
                        <div className="text-sm font-medium mt-2">Advanced Analytics</div>
                    </div>
                    <div className="text-white">
                        <div className="text-3xl font-bold text-purple-300">🎯</div>
                        <div className="text-sm font-medium mt-2">Smart Insights</div>
                    </div>
                    <div className="text-white">
                        <div className="text-3xl font-bold text-green-300">📈</div>
                        <div className="text-sm font-medium mt-2">Real-time Reports</div>
                    </div>
                    <div className="text-white">
                        <div className="text-3xl font-bold text-orange-300">🔒</div>
                        <div className="text-sm font-medium mt-2">Secure & Reliable</div>
                    </div>
                </div> */}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-2 flex flex-col justify-center items-center bg-white dark:bg-gray-800">
                <div className="xl:min-w-[450px] px-8">
                    <div className="mb-8">{content}</div>
                    {children
                        ? cloneElement(children as React.ReactElement, { ...rest })
                        : null}
                </div>
            </div>
        </div>

    )
}

export default Side
