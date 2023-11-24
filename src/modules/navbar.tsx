'use client'
import React, { useEffect, useState } from "react";
import CheckSession from '@/lib/checkSession';
import { Navbar, NavbarBrand, NavbarContent, DropdownItem, DropdownTrigger, Dropdown, Avatar } from "@nextui-org/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";

import { IconBrandAsana, IconUser, IconSettings, IconArrowBarRight } from '@tabler/icons-react'

import logo from '@/public/icons/lineas-solo.png';


export default function NavigationBar() {
    const [user, setUser] = useState<any>()
    const router = useRouter();
    const [userIsLoggedIn, setUserIsLoggedIn] = useState<any>();
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const checkUserSession = async () => {
            const session = await CheckSession();
            if (session.session == null) {
                router.push('/auth')
            } else {
                setUser(session.userData);
                setIsLoading(false);
                setUserIsLoggedIn(true)
            }
        };
        checkUserSession();
    }, [router]);

    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (!error) {
                router.push("/auth");
            } else {
            }
        } catch (error: any) {
            console.error("Sign out error:", error.message);
        }
    }

    return (
        isLoading ? (
            null
        ) : (
            <Navbar className="" isBlurred={true} maxWidth="full">

                <NavbarBrand>
                    <Image src={logo} alt="logo" height={32} width={32} />
                    <p className="font-bold text-inherit">Brandstrat</p>
                </NavbarBrand>

                <NavbarContent as="div" justify="end">

                    {userIsLoggedIn && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar src={user?.img} alt="user" className="bg-[#E7E7E8] text-[#1F1F21] cursor-pointer" aria-label="user" name={user.email} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mr-2">
                                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {user.role === 'admin' && (
                                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                        <IconBrandAsana className='w-[16px]' />
                                        Panel de Control
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => router.push(`/profile/${user.email}`)}>
                                        <IconUser className='w-[16px]' />
                                        Perfil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <IconSettings className='w-[16px]' />
                                        Ajustes
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <IconArrowBarRight className='w-[16px]' />
                                    <button>Cerrar Sesion</button>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                </NavbarContent>

            </Navbar>
        )
    );
}
