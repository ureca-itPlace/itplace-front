import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import api from '../../apis/axiosInstance';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import MyPageContentLayout from '../../features/myPage/layout/MyPageContentLayout';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import NoResult from '../../components/NoResult';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale/ko';
import { RiResetRightFill } from 'react-icons/ri';
import FadeWrapper from '../../features/myPage/components/FadeWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useMediaQuery } from 'react-responsive';
import BenefitInfoCard from '../../components/BenefitInfoCard';

import { useDispatch } from 'react-redux';
import { setTotalAmount as setTotalAmountAction } from '../../store/historySlice';

interface HistoryItem {
  image: string;
  benefitName: string;
  discountAmount: number;
  usedAt: string; // ISO 날짜 문자열
}

export default function MyHistoryPage() {
  const dispatch = useDispatch();
  // Redux 상태에서 사용자 정보 가져오기
  const user = useSelector((state: RootState) => state.auth.user);
  const membershipGrade = user?.membershipGrade ?? null;

  // 검색/필터/페이지네이션 상태
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState(''); // 디바운싱용
  const [page, setPage] = useState(0);
  const [size] = useState(5);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // API 데이터 상태
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  // ✅ 디바운싱 로직
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  // ✅ 혜택 사용 이력 API 호출 (페이지/필터 변화 시 재호출)
  useEffect(() => {
    if (!membershipGrade) return; // 멤버십 없으면 호출 X

    const fetchHistory = async () => {
      setLoading(true);
      try {
        let startParam: string | undefined;
        let endParam: string | undefined;

        if (startDate) {
          startParam = dayjs(startDate)
            .tz('Asia/Seoul')
            .startOf('day')
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss');
        }

        if (endDate) {
          endParam = dayjs(endDate)
            .tz('Asia/Seoul')
            .endOf('day')
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss');
        }
        console.log('시간 포함 날짜 파라미터:', { startParam, endParam });
        const res = await api.get('/api/v1/membership-history', {
          params: {
            keyword: debouncedKeyword || undefined,
            startDate: startParam,
            endDate: endParam,
            page,
            size,
          },
        });

        const data = res.data?.data;
        if (data && Array.isArray(data.content)) {
          console.log('멤버십 이력 데이터', data);
          setHistory(data.content);
          setCurrentPage(data.currentPage ?? 0);
          setTotalElements(data.totalElements ?? 0);
        } else {
          setHistory([]);
          setCurrentPage(0);
          setTotalElements(0);
        }
      } catch {
        setHistory([]);
        setCurrentPage(0);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [debouncedKeyword, startDate, endDate, page, size, membershipGrade]);

  // ✅ 이번 달 총 할인 금액 API 호출 (mount 시 1회)
  useEffect(() => {
    if (!membershipGrade) return;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/v1/membership-history/summary');
        const data = res.data?.data;
        const amount = data?.totalDiscountAmount ?? 0;

        setTotalAmount(amount);
        dispatch(setTotalAmountAction(amount));
      } catch {
        setTotalAmount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [membershipGrade, dispatch]);

  // ✅ debouncedKeyword, startDate, endDate가 바뀔 때마다 페이지를 0으로 초기화
  useEffect(() => {
    setPage(0);
  }, [debouncedKeyword, startDate, endDate]);

  return (
    <div className="flex flex-row gap-[28px] w-full h-full max-lg:flex-col max-md:flex-col-reverse max-md:px-5 max-md:pb-7 max-md:pt-[20px]">
      <MyPageContentLayout
        main={
          <div className="flex flex-col h-full">
            {/* 상단 타이틀 */}
            <h1 className="text-title-2 text-black mb-7 max-xl:text-title-4 max-xl:font-semibold max-md:hidden">
              혜택 사용 이력
            </h1>
            {/* 🔎 검색바 + 날짜필터 */}
            <div className="flex justify-between mb-8 gap-2 max-xlg:flex-col max-md:-mt-8">
              <SearchBar
                placeholder="혜택명으로 검색하기"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onClear={() => setKeyword('')}
                backgroundColor="bg-grey01"
                className="w-[280px] h-[50px] max-xl:max-w-[220px] max-xl:h-[44px] max-xlg:max-w-none max-xlg:w-full max-md:mb-2"
              />
              <div className="flex gap-2 items-center justify-end">
                <button
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  className="text-purple04 hover:text-purple05 text-body-0 max-xl:text-body-2"
                >
                  <RiResetRightFill />
                </button>
                <DatePicker
                  locale={ko}
                  showPopperArrow={false}
                  selected={startDate}
                  onChange={(date) => {
                    console.log('📅 시작 날짜 선택됨:', date);
                    setStartDate(date);
                  }}
                  dateFormat="yyyy-MM-dd"
                  maxDate={endDate ?? undefined}
                  placeholderText="시작 날짜"
                  className="border border-grey03 text-center rounded-[12px] px-2 h-[50px] w-[120px] max-xl:text-body-3 max-xl:h-[44px] max-xl:w-[110px] max-xlg:w-full max-md:h-[36px] max-md:rounded-[10px] placeholder:text-grey05 placeholder:font-normal placeholder:text-center outline-none focus:border-purple04"
                />
                <span className="text-grey05">~</span>
                <DatePicker
                  locale={ko}
                  showPopperArrow={false}
                  selected={endDate}
                  onChange={(date) => {
                    console.log('📅 종료 날짜 선택됨:', date);
                    setEndDate(date);
                  }}
                  dateFormat="yyyy-MM-dd"
                  minDate={startDate ?? undefined}
                  placeholderText="종료 날짜"
                  className="border border-grey03 text-center rounded-[12px] px-2 h-[50px] w-[120px] max-xl:text-body-3 max-xl:h-[44px] max-xl:w-[110px] max-xlg:w-full max-md:h-[36px] max-md:rounded-[10px] placeholder:text-grey05 placeholder:font-normal placeholder:text-center outline-none focus:border-purple04"
                />
              </div>
            </div>

            {/* 📋 혜택 사용 이력 리스트 */}
            <div className="flex-grow">
              {loading ? (
                // 로딩 중
                <div className="flex justify-center items-center h-full">
                  <LoadingSpinner />
                </div>
              ) : membershipGrade == null ? (
                <div className="mt-28 max-xl:mt-20">
                  <NoResult
                    message1="앗! 멤버십 등급이 없어 결과를 조회할 수 없어요"
                    message2="유플러스 회원이시라면 회원 정보 연동 후 이용할 수 있어요."
                    message1FontSize="max-xl:text-title-6"
                    message2FontSize="max-xl:text-body-3"
                    buttonText="회원 정보 연동하러가기"
                    buttonRoute="/myPage/info"
                  />
                </div>
              ) : history.length === 0 ? (
                <div className="mt-28 max-xl:mt-20">
                  <NoResult
                    message1="아직 받은 혜택이 없어요!"
                    message2="가까운 제휴처의 혜택을 찾아보세요."
                    message1FontSize="max-xl:text-title-6"
                    message2FontSize="max-xl:text-body-3"
                    buttonText="근처 혜택 보러가기"
                    buttonRoute="/main"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-5 max-xl:gap-3">
                  {isMobile
                    ? // ✅ 모바일 전용 컴포넌트
                      history.map((item, idx) => (
                        <BenefitInfoCard
                          key={idx}
                          image={item.image}
                          title={item.benefitName}
                          fields={[
                            { label: '제휴처명', value: item.benefitName },
                            {
                              label: '할인 금액',
                              value: `${item.discountAmount.toLocaleString()}원`,
                            },
                            {
                              label: '사용 일시',
                              value: dayjs
                                .utc(item.usedAt)
                                .tz('Asia/Seoul')
                                .format('YYYY-MM-DD HH:mm:ss'),
                            },
                          ]}
                        />
                      ))
                    : history.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center border border-purple02 rounded-[10px] p-2"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0 min-h-[40px]">
                            <img
                              src={item.image}
                              alt={item.benefitName}
                              className="h-[70px] w-auto object-contain flex-shrink-0 ml-3 max-xl:h-[50px] max-lg:hidden"
                            />
                            <span
                              className="ml-2 text-purple05 text-title-5 font-semibold overflow-hidden text-ellipsis whitespace-nowrap block max-xl:text-title-7 max-xl:font-semibold"
                              title={item.benefitName}
                            >
                              {item.benefitName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-black text-title-5 font-semibold w-[120px] text-right max-xl:text-title-7 max-xl:font-semibold max-lg:text-title-8">
                              {item.discountAmount.toLocaleString()}원
                            </span>
                            <span className="text-grey05 text-body-1 px-4 font-light max-xl:text-body-3 max-xl:font-light max-xl:px-3 max-xlg:text-body-5 max-lg:text-body-4">
                              {dayjs
                                .utc(item.usedAt)
                                .tz('Asia/Seoul')
                                .format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                          </div>
                        </div>
                      ))}
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {
              <div className="mt-auto flex justify-center max-md:mb-6">
                <Pagination
                  currentPage={currentPage + 1} // 0-based → 1-based
                  itemsPerPage={size}
                  totalItems={totalElements}
                  onPageChange={(p) => setPage(p - 1)}
                  width={37}
                />
              </div>
            }
          </div>
        }
        aside={
          <FadeWrapper changeKey={totalAmount.toLocaleString()}>
            {loading ? (
              // 로딩 중
              <div className="flex justify-center items-center mt-20 h-full">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="text-center">
                <h1 className="text-title-2 text-black mb-4 text-center max-lg:text-left max-xl:text-title-4 max-xl:mb-4 max-xl:font-semibold">
                  이번 달에 받은 혜택 금액
                </h1>
                <div className="flex flex-col max-lg:flex-row items-center justify-center max-lg:justify-start mt-6">
                  <img
                    src="/images/myPage/icon-money.webp"
                    alt="혜택 사용 이력 아이콘"
                    className="w-[250px] h-auto max-xl:w-[160px] max-lg:w-[100px]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/images/myPage/icon-money.png';
                    }}
                  />
                  <p className="text-[36px] font-semibold text-grey05 pt-10 max-xl:text-[28px] max-xl:pt-6 max-xlg:text-[24px]">
                    <span className="text-orange04">{totalAmount.toLocaleString()}</span>
                    원 <br className="max-lg:hidden" /> 할인 받았어요!
                  </p>
                </div>
              </div>
            )}
          </FadeWrapper>
        }
        bottomImage="/images/myPage/bunny-history.webp"
        bottomImageAlt="혜택 사용 이력 토끼"
        bottomImageFallback="/images/myPage/bunny-history.png"
      />
    </div>
  );
}
