"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RulesPoliciesModalProps {
  trigger: React.ReactNode
}

export default function RulesPoliciesModal({ trigger }: RulesPoliciesModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-center text-xl font-semibold text-[#5A0D16]">Rules & Policies</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="thai" className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="thai">ภาษาไทย</TabsTrigger>
              <TabsTrigger value="english">English</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="thai" className="mt-0">
            <ScrollArea className="max-h-[60vh] px-6 pb-6">
              <div className="space-y-6">
                <section className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h3 className="text-base font-semibold mb-3 text-amber-800 border-b pb-2 border-amber-200">
                    📄 เงื่อนไขการจองห้อง
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>ผู้ใช้งานต้องเข้าสู่ระบบก่อนทำการจองห้องทุกครั้ง</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>การจองจะถือว่าสำเร็จเมื่อได้รับสถานะ "อนุมัติ" เท่านั้น</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>หากไม่สามารถเข้าร่วมตามเวลาที่จอง กรุณายกเลิกล่วงหน้าอย่างน้อย 1 ชั่วโมง</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>การไม่มาใช้ห้องโดยไม่แจ้งล่วงหน้าเกิน 2 ครั้ง อาจถูกระงับสิทธิ์การจองชั่วคราว</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>ห้องนี้มีไว้เพื่อการศึกษา ประชุม หรือกิจกรรมที่ได้รับอนุญาตเท่านั้น</span>
                    </li>
                  </ul>
                </section>

                <section className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="text-base font-semibold mb-3 text-red-800 border-b pb-2 border-red-200">
                    📌 กฎระเบียบในการใช้ห้อง
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">❌</span>
                      <span>ห้ามนำอาหารหรือเครื่องดื่มเข้ามาในห้อง</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">🧹</span>
                      <span>กรุณารักษาความสะอาดหลังการใช้งาน</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">🔇</span>
                      <span>หลีกเลี่ยงการส่งเสียงดังรบกวนผู้อื่น</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">⏰</span>
                      <span>ออกจากห้องให้ตรงเวลา ตามช่วงเวลาที่จองไว้</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <span>ห้ามปรับเปลี่ยนอุปกรณ์หรือเฟอร์นิเจอร์โดยไม่ได้รับอนุญาต</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">🛑</span>
                      <span>การใช้ห้องในทางที่ผิดกฎ อาจถูกระงับสิทธิ์การใช้งานทันที</span>
                    </li>
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="english" className="mt-0">
            <ScrollArea className="max-h-[60vh] px-6 pb-6">
              <div className="space-y-6">
                <section className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h3 className="text-base font-semibold mb-3 text-amber-800 border-b pb-2 border-amber-200">
                    📄 Terms & Conditions
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>Users must log in before making any room reservations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>Reservations are only considered successful when marked as "Approved"</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>If unable to attend, please cancel at least 1 hour in advance</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>
                        Failing to show up without notice more than 2 times may result in temporary suspension
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-600 mr-2 font-bold">•</span>
                      <span>This room is for educational purposes, meetings, or authorized activities only</span>
                    </li>
                  </ul>
                </section>

                <section className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="text-base font-semibold mb-3 text-red-800 border-b pb-2 border-red-200">
                    📌 Rules & Regulations
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">❌</span>
                      <span>No food or drinks allowed in the room</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">🧹</span>
                      <span>Please keep the room clean after use</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">🔇</span>
                      <span>Avoid making loud noises that disturb others</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">⏰</span>
                      <span>Exit the room on time according to your reservation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <span>Do not modify equipment or furniture without permission</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">🛑</span>
                      <span>Improper use of the room may result in immediate suspension of privileges</span>
                    </li>
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            className="px-4 py-2 bg-[#5A0D16] text-white rounded-md text-sm font-medium hover:bg-[#4A0B12] transition-colors"
            onClick={() =>
              document.querySelector('[role="dialog"]')?.querySelector('button[aria-label="Close"]')?.click()
            }
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
