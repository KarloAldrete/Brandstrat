'use client';
import React, { useEffect, useState } from 'react';
import { IconWand, IconArrowForward } from '@tabler/icons-react';
import { ScrollShadow } from '@nextui-org/react';

const ChatModal = () => {
    const [currentMessage, setCurrentMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', message: string }[]>([]);
    const [modalInputPlaceholder, setModalInputPlaceholder] = useState("Haz una consulta...");

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setModalInputPlaceholder("Charlando en modal...");
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalInputPlaceholder("Haz una consulta...");
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentMessage(e.target.value);
    };

    const handleSendClick = async (value: string) => {
        setChatHistory(prevHistory => [...prevHistory, { role: 'user', message: value }]);

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: value,
                    },
                ],
            }),
        });

        const reader = response.body!.getReader();
        let chunks = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                setChatHistory(prevHistory => [...prevHistory, { role: 'bot', message: chunks }]);
                console.log(response);
                break;
            }
            chunks += new TextDecoder("utf-8").decode(value);
        }
    };

    const [hover, setHover] = useState(false);

    return (
        <>

            <div className=' w-full max-w-[628px] h-full max-h-[36px] border-2 border-[#E7E7E8] rounded-lg flex flex-row px-4 py-2 items-center justify-between'>

                <div className="w-full h-full max-h-5 flex flex-row items-center justify-start gap-2">
                    <IconWand size={20} className='text-[#89898A]' />
                    <input
                        type="text"
                        value={currentMessage}
                        placeholder={modalInputPlaceholder}
                        onChange={handleMessageChange}
                        className="bg-white w-full border-white focus:outline-none text-md font-medium text-[#89898A] placeholder:text-[#89898A]"
                    />
                </div>

                <div
                    className="w-auto h-full max-h-5 flex flex-row gap-1 items-center cursor-pointer ease-in-out duration-200"
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                    onClick={() => {
                        handleSendClick(currentMessage);
                        setCurrentMessage('');
                        handleOpenModal();
                    }}
                >
                    <IconArrowForward
                        size={20}
                        className='text-[#89898A]'
                    />
                    <span className={hover ? "font-semibold text-sm text-black duration-200" : "font-semibold text-sm text-[#89898A] duration-200"}>Enviar</span>
                </div>

            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

                    <div className="w-[640px] h-full rounded-lg bg-transparent flex flex-col justify-center gap-4" style={{ maxHeight: 'calc(100vh - 256px)'}}>

                        <ScrollShadow hideScrollBar className='flex flex-col gap-2 h-full max-h-[624px]' >

                            {chatHistory.map((chat, index) => (
                                <div key={index} className="bg-white p-4 flex flex-col gap-1 rounded-lg">
                                    <p className="font-bold">{chat.role === 'user' ? 'Tú' : 'Bot'}</p>
                                    <p>{chat.message}</p>
                                </div>
                            ))}

                        </ScrollShadow>

                        <div className=' w-full h-auto max-h-[64px] border-2 border-[#E7E7E8] rounded-lg flex flex-row px-4 py-2 items-center justify-between bg-white'>

                            <div className="w-full h-full max-h-5 flex flex-row items-center justify-start gap-2">
                                <IconWand size={20} className='text-[#89898A]' />
                                <input
                                    type="text"
                                    value={currentMessage}
                                    placeholder='En Desarrollo...'
                                    onChange={handleMessageChange}
                                    className="bg-white w-full border-white focus:outline-none text-md font-medium text-[#89898A] placeholder:text-[#89898A]"
                                />
                            </div>

                            <div
                                className="w-auto h-full max-h-5 flex flex-row gap-1 items-center cursor-pointer ease-in-out duration-200"
                                onMouseEnter={() => setHover(true)}
                                onMouseLeave={() => setHover(false)}
                                onClick={() => {
                                    handleSendClick(currentMessage);
                                    setCurrentMessage('');
                                }}
                            >
                                <IconArrowForward
                                    size={20}
                                    className='text-[#89898A]'
                                />
                                <span className={hover ? "font-semibold text-sm text-black duration-200" : "font-semibold text-sm text-[#89898A] duration-200"}>Enviar</span>
                            </div>

                        </div>

                    </div>

                </div>
            )}
        </>
    );
};

export default ChatModal;